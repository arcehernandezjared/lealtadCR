# API — LoyaltyCr

Base URL local: `http://localhost:4000`. Todas las respuestas son JSON. Los
errores siguen el formato:

```json
{ "error": { "code": "BAD_REQUEST", "message": "...", "details": { } } }
```

Autenticación: `Authorization: Bearer <accessToken>` en cada request
protegida. El refresh token viaja en una cookie `httpOnly` (`loyaltycr_refresh_token`),
nunca en el body/header — el cliente nunca debe leerlo.

> Este documento cubre los endpoints implementados hasta la Fase 4. Se irá
> ampliando en cada fase (notificaciones/campañas en Fase 5, etc.).

## Auth (`/api/auth`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/register` | — | Crea un negocio nuevo + su OWNER. Devuelve `accessToken` y setea la cookie de refresh. |
| POST | `/login` | — | Autentica. Si el usuario tiene staff membership en 1 negocio, devuelve tokens directo. Si tiene en varios, devuelve `{ requiresBusinessSelection: true, preAuthToken, businesses[] }`. |
| POST | `/select-business` | `preAuthToken` | Completa el login eligiendo negocio (`{ businessId }`). |
| POST | `/refresh` | cookie de refresh | Rota el refresh token y emite un access token nuevo. |
| POST | `/logout` | cookie de refresh | Revoca el refresh token actual. |
| POST | `/verify-email` | — | `{ token }` — confirma el email del usuario. |
| POST | `/request-password-reset` | — | `{ email }` — siempre 200, exista o no la cuenta (no filtra emails registrados). |
| POST | `/reset-password` | — | `{ token, password }` — cierra todas las sesiones activas del usuario al usarse. |

## Negocio (`/api/business`) — requiere staff autenticado

| Método | Ruta | Rol mínimo | Descripción |
|---|---|---|---|
| GET | `/me` | cualquiera | Perfil del usuario + negocio + rol + contadores. |
| PATCH | `/` | OWNER | Actualiza datos del negocio (nombre, logo, moneda, etc.). |
| GET | `/branches` | cualquiera | Lista sucursales del negocio. |
| POST | `/branches` | OWNER | Crea una sucursal. |
| GET | `/employees` | MANAGER | Lista el equipo del negocio. |
| POST | `/employees` | OWNER | Invita un empleado (crea `User` si no existe + envía email de invitación/set-password). |

## Analytics (`/api/analytics`) — requiere staff autenticado

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/overview?range=today\|7d\|30d\|90d\|custom&from&to` | Estadísticas agregadas del dashboard (clientes, visitas, puntos, recompensas, tasa de retorno, actividad reciente). |
| GET | `/series?range=...` | Series diarias para los gráficos (clientes nuevos, visitas, puntos otorgados, recompensas canjeadas). |

## Programas (`/api/programs`) — requiere staff autenticado

| Método | Ruta | Rol mínimo | Descripción |
|---|---|---|---|
| GET | `/` | cualquiera | Lista los programas del negocio, con reglas/niveles/recompensas incluidos. |
| POST | `/` | OWNER | Crea un programa. |
| GET | `/:programId` | cualquiera | Detalle de un programa. |
| PATCH | `/:programId` | OWNER | Actualiza un programa. |
| POST | `/:programId/rules` | OWNER | Crea una regla (`eventType`/`action` validados contra `packages/shared/src/rule-engine/registry.ts`). |
| PATCH/DELETE | `/:programId/rules/:ruleId` | OWNER | Actualiza/elimina una regla. |
| POST | `/:programId/tiers` | OWNER | Crea un nivel (`minPoints`, color, beneficios). |
| DELETE | `/:programId/tiers/:tierId` | OWNER | Elimina un nivel. |
| GET | `/:programId/rewards` | cualquiera | Lista las recompensas del programa. |
| POST | `/:programId/rewards` | OWNER | Crea una recompensa. |
| PATCH/DELETE | `/:programId/rewards/:rewardId` | OWNER | Actualiza/elimina una recompensa. |

## Recompensas (`/api/rewards`) — requiere staff autenticado

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/redeem` | `{ code }` — canjea un código de recompensa (`LOYAL-XXXXXX`). Rate-limited (prevención de fraude). |

## Clientes (`/api/customers`) — requiere staff autenticado

| Método | Ruta | Rol mínimo | Descripción |
|---|---|---|---|
| GET | `/?search&status&page&pageSize` | cualquiera | Lista clientes con búsqueda y paginación. |
| POST | `/` | MANAGER | Crea un cliente. |
| GET | `/:customerId` | cualquiera | Perfil completo: cuentas de lealtad, visitas, compras, recompensas, historial de puntos. |
| PATCH | `/:customerId` | MANAGER | Actualiza datos del cliente. |
| POST | `/:customerId/visit` | cualquiera | Registra una visita (`{ programId, branchId?, notes? }`) y dispara el motor de reglas. Rate-limited. |
| POST | `/:customerId/purchase` | cualquiera | Registra una compra (`{ programId, amount, items? }`) y dispara el motor de reglas. Rate-limited. |
| POST | `/:customerId/points` | cualquiera | Ajuste manual de puntos (`{ programId, points, reason }`), sin pasar por reglas. Rate-limited. |
| GET | `/by-qr/:qrCode` | cualquiera | Resuelve un cliente por su QR (usado por la interfaz de "escanear cliente" del empleado). Devuelve el mismo perfil completo que `/:customerId`. |

Las respuestas de `visit`/`purchase`/`points` incluyen `loyalty` (o el resultado
directo, según el endpoint) con el nuevo balance, si cambió de nivel
(`tierChanged`) y las recompensas recién desbloqueadas (`unlockedRedemptions`,
cada una con su código único de canje).

## Portal del cliente (`/api/portal`)

Identidad separada del staff: el `qrCode` del cliente (alta entropía, no
adivinable) funciona como credencial de posesión — quien tenga el enlace/QR
puede ver el progreso de ese cliente, sin password. Ver
`docs/ARCHITECTURE.md` → "Portal del cliente" para el detalle de diseño.

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/session` | — (público, rate-limited) | `{ qrCode }` — cambia el QR por un `accessToken` de sesión de cliente (12h). |
| GET | `/me` | token de cliente | Perfil + una entrada por cada programa activo del negocio (con progreso hacia el siguiente nivel/recompensa), aunque el cliente todavía no tenga actividad. |
| GET | `/rewards` | token de cliente | Todas las recompensas activas con su estado para este cliente (`LOCKED`/`READY`/`PENDING`/`REDEEMED`/...). |
| GET | `/history` | token de cliente | Historial de puntos, visitas y compras (solo lectura). |
| GET | `/wallet/apple/:programId` | token de cliente | Genera y descarga el `.pkpass` firmado. `400` con `error.details.code = "APPLE_WALLET_NOT_CONFIGURED"` si el negocio no tiene credenciales de Apple configuradas. |
| GET | `/wallet/google/:programId` | token de cliente | `{ saveUrl }` — enlace "Agregar a Google Wallet". `400` con `error.details.code = "GOOGLE_WALLET_NOT_CONFIGURED"` si no hay credenciales de Google. |

El token de cliente y el de staff se firman con el mismo secreto pero llevan
un campo `type` (`"staff"` / `"customer"`) que cada middleware exige
explícitamente — un token de un tipo nunca es aceptado por el middleware del
otro, aunque la firma sea válida (ver `apps/api/src/lib/jwt.ts`).

## Apple Wallet Web Service (`/v1`) — fuera de `/api`

Protocolo fijo definido por Apple (es el `webServiceURL` que lleva cada
pass), no autenticado con nuestro JWT sino con el `authenticationToken`
propio del pass (`Authorization: ApplePass <token>`). Lo llama el propio
dispositivo del cliente, nunca nuestro frontend. Ver `docs/APPLE_WALLET.md`.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber` | El dispositivo se registra para recibir actualizaciones (`{ pushToken }`). |
| DELETE | (mismo path) | El dispositivo se da de baja. |
| GET | `/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier?passesUpdatedSince=` | Lista los `serialNumbers` que cambiaron para ese dispositivo. `204` si no hay ninguno. |
| GET | `/passes/:passTypeIdentifier/:serialNumber` | Devuelve el `.pkpass` actualizado. |
| POST | `/log` | Logging de errores que reporta el dispositivo (sin auth). |

## Admin (`/api/admin`) — requiere `SUPER_ADMIN`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/businesses?page&pageSize` | Lista todos los negocios de la plataforma. |
| PATCH | `/businesses/:businessId/status` | `{ status: "ACTIVE" \| "SUSPENDED" \| "CANCELLED" }`. |
| GET | `/stats` | Estadísticas globales de la plataforma. |

## Próximos endpoints (planeados por fase)

- **Fase 5**: `POST /api/campaigns`, `POST /api/automations`.
- **Fase 6**: `GET /api/subscriptions`, endpoints de billing.
