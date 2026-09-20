# API — LoyaltyCr

Base URL local: `http://localhost:4000`. Todas las respuestas son JSON. Los
errores siguen el formato:

```json
{ "error": { "code": "BAD_REQUEST", "message": "...", "details": { } } }
```

Autenticación: `Authorization: Bearer <accessToken>` en cada request
protegida. El refresh token viaja en una cookie `httpOnly` (`loyaltycr_refresh_token`),
nunca en el body/header — el cliente nunca debe leerlo.

> Este documento cubre los endpoints implementados hasta la Fase 1. Se irá
> ampliando en cada fase (clientes/puntos/recompensas en Fase 2, wallet en
> Fase 4, etc.).

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

## Admin (`/api/admin`) — requiere `SUPER_ADMIN`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/businesses?page&pageSize` | Lista todos los negocios de la plataforma. |
| PATCH | `/businesses/:businessId/status` | `{ status: "ACTIVE" \| "SUSPENDED" \| "CANCELLED" }`. |
| GET | `/stats` | Estadísticas globales de la plataforma. |

## Próximos endpoints (planeados por fase)

- **Fase 2**: `GET/POST /api/customers`, `POST /api/customers/:id/points`,
  `POST /api/customers/:id/visit`, `GET/POST /api/programs`,
  `POST /api/programs/:id/rules`, `GET/POST /api/rewards`,
  `POST /api/rewards/:id/redeem`.
- **Fase 3**: `GET /api/customers/:id/qr`, `POST /api/pos/scan`.
- **Fase 4**: `POST /api/wallet/apple`, `POST /api/wallet/google`,
  `GET /v1/passes/:type/:serial` (Apple Wallet Web Service).
- **Fase 5**: `POST /api/campaigns`, `POST /api/automations`.
- **Fase 6**: `GET /api/subscriptions`, endpoints de billing.
