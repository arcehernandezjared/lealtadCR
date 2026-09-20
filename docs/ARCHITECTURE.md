# Arquitectura — LoyaltyCr

## Visión general

LoyaltyCr es un monorepo (pnpm workspaces + Turborepo) con dos aplicaciones y
cuatro paquetes compartidos:

```
apps/api      Express + TypeScript. API REST. Toda la lógica de negocio vive aquí.
apps/web      React + Vite + TypeScript + Tailwind. Landing, auth, dashboard,
              portal del cliente (móvil, sin login) e interfaz de empleado (POS).
packages/database       Prisma schema + cliente singleton + extension de aislamiento
                         multi-tenant + seed de datos de desarrollo.
packages/shared          Tipos, schemas de validación (zod), registro extensible de
                         eventos/acciones del motor de reglas, utilidades de auth
                         (hashing de passwords, tipos de tokens), manejo de errores.
packages/wallet          Generación/firma de .pkpass (Apple), cliente de la Google
                         Wallet API, y las piezas de cada protocolo que no dependen
                         de la base de datos (JWTs, PKCS#7, PNG placeholder, APNs).
packages/notifications   Envío de Web Push real (VAPID) sin tocar Prisma — igual
                         filosofía que packages/wallet.
```

`packages/database`, `packages/shared`, `packages/wallet` y
`packages/notifications` no dependen de `apps/*`: son librerías internas
consumidas por el backend (y, en el caso de `shared`, también por el
frontend). `packages/wallet` y `packages/notifications` en particular están
diseñados para no tocar Prisma directamente — solo reciben los datos que ya
resolvió el módulo correspondiente de `apps/api`, para poder testear la
generación de passes/envíos con credenciales de prueba sin necesitar una
base de datos.

## Multi-tenancy

Cada negocio (`Business`) es un tenant. El aislamiento se garantiza en dos
capas:

1. **Middleware de autenticación** (`apps/api/src/middleware/auth.middleware.ts`):
   al autenticar un token de staff (OWNER/MANAGER/EMPLOYEE), resuelve el
   `businessId` desde el JWT (nunca desde un parámetro que envíe el cliente)
   y construye `req.tenantDb`, un cliente Prisma con el filtro de tenant ya
   aplicado.
2. **Prisma Client Extension** (`packages/database/src/tenant.ts`): para los
   modelos con columna `businessId` directa (`Branch`, `Employee`, `Customer`,
   `LoyaltyProgram`, `Campaign`, `Automation`, `Notification`, `AuditLog`,
   `Visit`, `Purchase`, `Referral`), la extension inyecta
   `businessId = tenantBusinessId` en **todas** las operaciones (find, create,
   update, delete), de forma que es estructuralmente imposible que una query
   "olvide" el filtro — no depende de que cada desarrollador se acuerde de
   agregar el `where`.

   Para modelos que no tienen `businessId` directo (`LoyaltyRule`,
   `LoyaltyAccount`, `LoyaltyTransaction`, `Reward`, `RewardRedemption`,
   `WalletPass`, `WalletDeviceRegistration` — todos alcanzables solo a través
   de su padre `program`/`customer`/`account`), el aislamiento se garantiza
   en la capa de servicio, resolviendo siempre el padre primero con el
   `businessId` del tenant autenticado antes de tocar el hijo.

   Esto está cubierto por tests de integración en
   `apps/api/tests/multi-tenant-isolation.test.ts`.

## Roles

- `SUPER_ADMIN` vive en `User.globalRole`. No pertenece a ningún negocio;
  administra la plataforma completa (`/api/admin/*`).
- `OWNER` / `MANAGER` / `EMPLOYEE` viven en `Employee.role`, una membresía de
  staff de un `Business` específico. Un mismo `User` puede tener membresías de
  staff en varios negocios (por eso el login soporta selección de negocio
  cuando hay más de una).
- `CUSTOMER` no es un rol de autenticación tradicional: es la existencia de un
  registro `Customer` en un `Business`. Su identidad principal es el QR
  (`Customer.qrCode`); opcionalmente puede vincularse a un `User` para
  acceder al portal del cliente (Fase 3).

Jerarquía de permisos de staff: `OWNER > MANAGER > EMPLOYEE`
(`packages/shared/src/constants/roles.ts`, `employeeRoleAtLeast`).

## Autenticación

- **Access token**: JWT firmado (HS256), 15 minutos, nunca se persiste.
  Contiene `employeeContext` (businessId + rol) para que cada request pueda
  resolver el tenant sin ir a la base de datos.
- **Refresh token**: token opaco de alta entropía, se persiste **hasheado**
  (SHA-256) en `RefreshToken`, viaja en una cookie `httpOnly`. Rotación en
  cada uso: el token viejo se marca `revokedAt` y se emite uno nuevo. Si se
  reutiliza un token ya revocado (indicio de robo), se revocan **todas** las
  sesiones del usuario como contención.
- **Passwords**: bcrypt (12 rounds) vía `bcryptjs` — ver nota de decisión en
  `packages/shared/src/auth/password.ts` (se prefirió sobre Argon2 nativo
  para evitar dependencias de compilación nativa en el entorno de desarrollo).
- **Verificación de email / reset de password**: tokens opacos de un solo uso,
  hasheados en DB, con expiración corta.
- **Login con múltiples negocios**: si un usuario tiene membresías de staff en
  más de un negocio, `/api/auth/login` devuelve `requiresBusinessSelection`
  con un `preAuthToken` de 15 minutos (sin `employeeContext`, por lo que no
  sirve para ninguna otra ruta) que se canjea en `/api/auth/select-business`.

## Motor de reglas de lealtad (extensible)

`LoyaltyRule.eventType` y `LoyaltyRule.action` son columnas `String`, no enums
de Postgres, a propósito: el conjunto de eventos/acciones soportado vive en
`packages/shared/src/rule-engine/registry.ts` (`LOYALTY_EVENTS`,
`LOYALTY_ACTIONS`) y se valida en la capa de aplicación con zod. Agregar un
evento nuevo (ej. `no_show`) es agregar una entrada al registro + su handler
en `apps/api/src/engine/rule-engine.ts` — **sin migración de base de datos**.
El mismo registro se reutiliza en el frontend
(`apps/web/src/routes/dashboard/programs/RulesSection.tsx`) para renderizar
el formulario de creación de reglas con las opciones de evento/acción
correctas.

El mismo patrón aplica a `Automation.triggerType`
(`packages/shared/src/rule-engine/automation-triggers.ts`), a implementar en
la Fase 5.

### Pipeline de escritura del ledger (Fase 2)

Todo cambio de puntos —venga de una regla automática o de un ajuste manual—
pasa por un único punto de escritura: `applyLoyaltyDelta()` en
`apps/api/src/engine/loyalty-ledger.ts`. Dentro de una sola transacción de
Postgres:

1. Se hace `upsert` de la `LoyaltyAccount` (se crea en el primer evento del cliente en ese programa).
2. Se inserta la entrada del ledger (`LoyaltyTransaction`, append-only) solo si hay cambio de puntos.
3. Se recalculan `points`/`visits`/`stamps`/`totalSpent`.
4. Se reevalúa el nivel (`LoyaltyTier` con `minPoints` más alto que no supere el nuevo balance).
5. Se revisan las recompensas activas del programa y se desbloquean (`RewardRedemption` en `PENDING` con código único) las que el cliente ya puede reclamar, respetando `limitPerCustomer` y `quantityAvailable`.

`apps/api/src/engine/rule-engine.ts` (`triggerLoyaltyEvent`) es la capa que
traduce un evento de negocio (visita, compra, cumpleaños...) en un delta de
puntos según las `LoyaltyRule` activas del programa, y llama a
`applyLoyaltyDelta`. Los ajustes manuales de un OWNER/MANAGER
(`POST /api/customers/:id/points`) llaman a `applyLoyaltyDelta` directamente,
sin pasar por el matching de reglas.

## Portal del cliente y QR (Fase 3)

El `qrCode` de cada `Customer` (un cuid, alta entropía) es tanto el valor
codificado en el QR físico/digital de la tarjeta como la credencial de
acceso al portal: **no existe registro/login de cliente**. Quien tiene el
enlace/QR puede ver el progreso de esa tarjeta — el mismo modelo que usan la
mayoría de programas de lealtad digitales (la tarjeta física tampoco pedía
password). Esto es una decisión de producto, no solo tecnica: reduce la
fricción de "primer uso" a cero.

Flujo:

1. `POST /api/portal/session { qrCode }` (público, rate-limited) resuelve el
   `Customer` por su QR y emite un `CustomerAccessTokenPayload` (JWT, 12h)
   distinto del token de staff.
2. El frontend (`/portal/:qrCode`) pide una sesión nueva en cada carga de
   página — no persiste el token entre recargas a propósito, porque el QR en
   la URL ya es suficiente para reobtenerlo, y evita tener que preocuparse
   por invalidacion/renovacion de tokens de cliente en el cliente.
3. `GET /api/portal/me|rewards|history` requieren ese token.

**Confusión de tokens entre audiencias**: el token de staff y el de cliente
se firman con el mismo `JWT_ACCESS_SECRET` (no hay razón operativa para
tener dos secretos), lo que significa que un JWT de cliente decodifica
"correctamente" si se verifica con las reglas de staff (incluso sin volver a
firmarlo). Para que esto no se traduzca en un bypass de autorización sutil,
ambos payloads llevan un campo `type` (`"staff"` / `"customer"`) que
`verifyAccessToken`/`verifyCustomerAccessToken` exigen explícitamente,
haciendo que un token del tipo equivocado falle con 401 aunque la firma sea
válida (`apps/api/src/lib/jwt.ts`).

**Cliente sin actividad todavía**: `LoyaltyAccount` se crea recién en el
primer evento de puntos de un cliente (ver pipeline del ledger arriba). El
portal y la lista de recompensas iteran sobre los **programas activos del
negocio**, no sobre las `LoyaltyAccount` existentes, y sintetizan un estado
"0 puntos" para los que todavia no tienen cuenta — de otro modo, un cliente
recien creado veria su tarjeta vacia en vez de en cero.

**Interfaz de empleado (POS)**: `GET /api/customers/by-qr/:qrCode` (staff,
tenant-scoped) resuelve el mismo QR para el flujo de mostrador. Acepta tanto
un QR leido por un lector de codigo de barras USB/Bluetooth (que escribe el
valor como si fuera un teclado y manda Enter) como el codigo tipeado a mano,
cubriendo "el empleado puede escanear o introducir el codigo" sin depender
de acceso a camara del navegador — la Fase 3 no incluye escaneo por camara
porque no hay forma de probarlo de punta a punta en este entorno de
desarrollo (sin camara real disponible), y no queria dejar esa ruta a medio
probar.

## Apple Wallet y Google Wallet (Fase 4)

Ver `docs/APPLE_WALLET.md` y `docs/GOOGLE_WALLET.md` para el detalle de
credenciales y protocolo de cada plataforma. Aquí, las decisiones de diseño
que no son obvias leyendo el código:

- **`packages/wallet` no toca la base de datos.** Recibe datos ya resueltos
  (`LoyaltyPassData`, `LoyaltyClassData`, etc.) y devuelve buffers/URLs. Esto
  permite testear la generación real de `.pkpass` (firma PKCS#7 incluida) y
  del JWT de Google (firma RS256 incluida) con certificados/llaves de prueba
  generados en el momento del test, sin necesitar Postgres ni credenciales
  de Apple/Google reales — ver los tests en `packages/wallet/src/apple/*.test.ts`
  y `packages/wallet/src/google/*.test.ts`.
- **La verificación de pertenencia al tenant va siempre antes que la
  verificación de configuración.** `issueApplePass`/`issueGooglePass`
  (`apps/api/src/modules/wallet/wallet.service.ts`) resuelven primero
  `getPassContext()` (que falla con 404 si el cliente/programa no son del
  negocio autenticado) y solo después revisan si hay credenciales reales
  configuradas. Si el orden fuera al revés, alguien probando con IDs ajenos
  podría deducir si un negocio cualquiera tiene o no Wallet configurado.
- **El icono/logo del `.pkpass` se generan on-the-fly** como PNG de color
  sólido a partir del color de marca del programa
  (`packages/wallet/src/apple/solid-color-png.ts`, un encoder PNG mínimo
  sin dependencias) porque Apple exige al menos `icon.png` para que el pass
  sea válido, y el producto todavía no tiene upload de logos de negocio.
- **La actualización de wallets es un efecto secundario del ledger, no un
  paso explícito que cada endpoint tenga que recordar llamar.**
  `applyLoyaltyDelta()` (`apps/api/src/engine/loyalty-ledger.ts`) llama a
  `notifyWalletsOfChange()` después de confirmar la transacción — fuera de
  ella (es I/O de red hacia Apple/Google, no debe alargar el lock de la
  transacción) y sin esperar su resultado (el cliente que registró la
  visita no debe esperar a que Apple/Google respondan). La función nunca
  lanza: un fallo al notificar un wallet no debe tumbar la operación de
  negocio que lo originó.
- **Apple vs. Google requieren arquitecturas de actualización distintas, y
  el código lo refleja en vez de esconder la diferencia:** Apple necesita
  push-to-pull vía su propio Wallet Web Service + APNs (ver
  `apple-web-service.ts`); Google se actualiza con un `PATCH` directo a la
  API REST y el propio Google notifica al dispositivo. No hay una
  abstracción comun que finja que ambas plataformas funcionan igual.

## Notificaciones, campañas y automatizaciones (Fase 5)

**Cuatro canales, cuatro mecanismos de entrega distintos** (sección 15 del
brief) — `apps/api/src/modules/notifications/notifications.service.ts`
nunca trata "notificación" como una sola cosa:

| Canal | Cómo entrega | Requiere |
|---|---|---|
| `EMAIL` | `apps/api/src/lib/email.ts` (Fase 1) | `customer.email` |
| `WEB_PUSH` | Push API del navegador real, vía `packages/notifications` (VAPID) | Una `PushSubscription` activa del cliente |
| `WALLET_UPDATE` | Delega en `notifyWalletsOfChange()` (Fase 4) — push-to-pull en Apple, `PATCH` directo en Google | Un `WalletPass` ya emitido |
| `WHATSAPP` | No implementado — falla explícitamente con un mensaje claro, mismo principio que Apple/Google Wallet sin credenciales | Cuenta de WhatsApp Business API (no disponible) |

Cada intento queda como una fila de `Notification` (`PENDING` → `SENT`/`FAILED`
con el motivo del fallo en `metadata`), sea cual sea el canal — es el log de
auditoría de "qué se le dijo a cada cliente y cómo" que pide la sección 26.

**Web Push es el único canal de esta fase que funciona de verdad sin pedirle
nada externo al usuario** (a diferencia de Wallet/WhatsApp): las llaves VAPID
se generan una vez (`npx web-push generate-vapid-keys`, ver `.env.example`) y
no requieren aprobación de terceros. El flujo completo está implementado:
Service Worker (`apps/web/public/sw.js`) → `subscribeToPush()` en el portal
(Push API real del navegador) → `POST /api/portal/push-subscription` →
`packages/notifications` envía contra el endpoint real del navegador
(FCM/Mozilla/etc. segun el navegador) usando la librería `web-push`.

**Notificaciones automáticas son "fire and forget" desde el ledger**, igual
que la actualización de Wallet: `runPostDeltaNotificationsAndAutomations()`
en `apps/api/src/engine/loyalty-ledger.ts` se llama sin `await` después de
que la transacción de puntos ya confirmó, para que enviar un email o evaluar
automatizaciones nunca alargue la respuesta HTTP de una visita/compra. Esto
tiene una consecuencia real para quien escriba tests: verificar que una
notificación se creó requiere sondear (`waitFor` con reintentos cortos) en
vez de asumir que ya existe apenas responde la request original — ver
`apps/api/tests/helpers/wait-for.ts` y su uso en
`tests/notifications-automations-campaigns.test.ts`.

**Motor de automatizaciones** (`apps/api/src/modules/automations/automations-engine.ts`),
dos formas de evaluación según `AUTOMATION_TRIGGERS[...].evaluation`
(`packages/shared/src/rule-engine/automation-triggers.ts`):

- **Por evento** (`points_threshold_reached`, `tier_reached`): se evalúan en
  caliente desde el mismo hook del ledger que dispara las notificaciones.
  `points_threshold_reached` se deduplica para dispararse **una sola vez por
  cliente** (revisando si ya existe una `AutomationExecution` exitosa
  previa) — funciona como un logro de una sola vez, no como un umbral que se
  re-dispara cada vez que el balance sigue por encima. `tier_reached` sí
  puede volver a dispararse (un cliente puede bajar de nivel por un ajuste
  manual y volver a subir legítimamente).
- **Programadas** (`customer_inactive`, `customer_birthday`): evaluadas por
  `runScheduledAutomations()`, invocado cada hora por un `setInterval` en el
  mismo proceso (`apps/api/src/jobs/automation-scheduler.ts`) — **limitación
  conocida y aceptada**: sirve para un despliegue de una sola instancia; si
  LoyaltyCr llegara a correr en varias instancias a la vez habría que mover
  esto a un cron externo o una cola dedicada, documentado en el propio
  archivo en vez de resolverse con infraestructura que todavía no hace falta.
  Es idempotente dentro de una ventana de ~20h para que correr el scheduler
  varias veces al día no duplique notificaciones.

Las acciones de una automatización (`add_points`, `send_notification`,
`update_wallet`, `create_reward_unlock`) reutilizan las mismas funciones que
ya usan las reglas/ledger/wallet en vez de reimplementar su propia versión —
una automatización que agrega puntos pasa por `applyLoyaltyDelta()` como
cualquier otro origen de puntos, así que también puede a su vez desbloquear
recompensas, cambiar de nivel o disparar otra automatización, encadenando de
forma consistente con el resto del sistema.

## Analytics

Los modelos "indirectos" (sin `businessId` propio) se consultan con el
cliente Prisma crudo y filtros de relación explícitos
(`account: { program: { businessId } }`), nunca confiando en un id que venga
del cliente sin ese join — ver `apps/api/src/modules/analytics/analytics.service.ts`.
Las series temporales de los gráficos usan `$queryRaw` con `date_trunc` de
Postgres (parametrizado vía `Prisma.sql`, sin concatenación de strings) por
no haber una forma portable de agrupar por día con el query builder de Prisma.

## Plan de fases

1. **Fase 1 (completada)**: arquitectura, base de datos completa, auth,
   multi-tenancy, negocios/empleados/sucursales, dashboard con analytics básico.
2. **Fase 2 (completada)**: clientes, puntos, visitas, motor de reglas activo, recompensas, niveles.
3. **Fase 3 (completada)**: QR por cliente, portal del cliente, interfaz de empleado (POS).
4. **Fase 4 (completada, sin credenciales reales aun)**: Apple Wallet y Google Wallet (ver docs/APPLE_WALLET.md y docs/GOOGLE_WALLET.md).
5. **Fase 5 (completada)**: notificaciones multicanal, campañas, automatizaciones.
6. **Fase 6**: analytics avanzado, suscripciones/planes con límites reales, administración global.
7. **Fase 7**: testing exhaustivo, hardening de seguridad, optimización, deployment a producción.

## Decisiones técnicas notables

| Decisión | Razón |
|---|---|
| bcrypt (bcryptjs) en vez de Argon2 | Evita dependencias nativas de compilación en desarrollo (Windows sin toolchain garantizado). Sigue siendo un estándar de la industria válido. |
| `eventType`/`action` como `String`, no enum de Postgres | Extensibilidad sin migraciones, según lo pedido explícitamente en la sección 7 del brief. |
| Prisma Client Extension para tenant scoping | Hace el aislamiento estructural (a nivel de tipo de query), no dependiente de que cada desarrollador recuerde el `where`. |
| Access token en memoria (no localStorage) en el frontend | Reduce superficie de robo por XSS. El refresh token vive en cookie `httpOnly`. |
| UUID público + cuid interno en cada tabla | El cuid interno es más rápido para joins/índices; el UUID público es lo único expuesto en la API, evitando enumeración secuencial de recursos. |
