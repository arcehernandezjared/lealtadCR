# Arquitectura — LoyaltyCr

## Visión general

LoyaltyCr es un monorepo (pnpm workspaces + Turborepo) con dos aplicaciones y
dos paquetes compartidos:

```
apps/api      Express + TypeScript. API REST. Toda la lógica de negocio vive aquí.
apps/web      React + Vite + TypeScript + Tailwind. Landing, auth, dashboard,
              (en fases futuras: portal del cliente, interfaz de empleado).
packages/database  Prisma schema + cliente singleton + extension de aislamiento
                    multi-tenant + seed de datos de desarrollo.
packages/shared     Tipos, schemas de validación (zod), registro extensible de
                    eventos/acciones del motor de reglas, utilidades de auth
                    (hashing de passwords, tipos de tokens), manejo de errores.
```

`packages/database` y `packages/shared` no dependen de `apps/*`: son
librerías internas consumidas por el backend (y, en el caso de `shared`,
también por el frontend para reutilizar schemas/tipos sin duplicarlos).

`packages/wallet` y `packages/notifications`, mencionados en el brief
original como paquetes independientes, se crearán en la Fase 4 y Fase 5
respectivamente, cuando haya código real que justifique separarlos (evitar
crear paquetes vacíos de antemano).

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
en el motor de evaluación del backend (Fase 2) — **sin migración de base de
datos**. El mismo registro se reutiliza en el frontend para renderizar el
formulario de creación de reglas con el schema de condiciones correcto según
el evento elegido.

El mismo patrón aplica a `Automation.triggerType`
(`packages/shared/src/rule-engine/automation-triggers.ts`).

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
2. **Fase 2**: clientes, puntos, visitas, motor de reglas activo, recompensas, niveles.
3. **Fase 3**: QR por cliente, portal del cliente, interfaz de empleado (POS).
4. **Fase 4**: Apple Wallet y Google Wallet (ver docs/APPLE_WALLET.md y docs/GOOGLE_WALLET.md).
5. **Fase 5**: notificaciones multicanal, campañas, automatizaciones.
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
