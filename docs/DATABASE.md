# Base de datos — LoyaltyCr

PostgreSQL + Prisma. Schema completo en
[`packages/database/prisma/schema.prisma`](../packages/database/prisma/schema.prisma).

## Convenciones

- **`id`** (cuid): identificador interno, usado solo para relaciones FK.
  Nunca se expone en la API.
- **`publicId`** (uuid): el único identificador que se expone en respuestas
  de API y URLs. Evita enumeración secuencial de recursos entre negocios.
- **Timestamps**: `createdAt`/`updatedAt` en (casi) todos los modelos.
- **`eventType`/`action`/`triggerType` como `String`**: ver
  `docs/ARCHITECTURE.md` → "Motor de reglas". Se validan en la capa de
  aplicación contra `packages/shared/src/rule-engine/registry.ts`.

## Diagrama de entidades (simplificado)

```
User ──┬── Employee (N:1 Business, rol de staff)
       └── Customer (N:1 Business, identidad de cliente)

Business ── Branch, Employee, Customer, LoyaltyProgram,
            Campaign, Automation, Notification, AuditLog,
            Visit, Purchase, Referral, Subscription(1:1)

LoyaltyProgram ── LoyaltyRule, LoyaltyTier, Reward, LoyaltyAccount, WalletPass

Customer ── LoyaltyAccount (1 por programa) ── LoyaltyTransaction (ledger, append-only)
         └─ WalletPass (1 por programa+plataforma) ── WalletDeviceRegistration

Reward ── RewardRedemption (N por cliente, código único de canje)

Plan ── Subscription (1:1 Business) ── Payment
```

## Por qué el ledger de puntos es append-only

`LoyaltyTransaction` nunca se actualiza ni se borra, solo se inserta. El
balance vivo está en `LoyaltyAccount.points` (denormalizado por rendimiento)
y se recalcula transaccionalmente cada vez que se inserta una transacción.
Esto da:

- **Auditoría real**: se puede reconstruir el historial completo de cómo un
  cliente llegó a su balance actual (requerido por la sección 26/27 del brief,
  prevención de fraude).
- **Sin condiciones de carrera silenciosas**: un `UPDATE points = points + N`
  concurrente sin ledger puede perder escrituras bajo carga; el patrón
  ledger + recálculo dentro de una transacción de Prisma (`$transaction`) es
  más seguro y además queda todo trazado.

## Por qué algunos modelos no tienen `businessId` directo

`LoyaltyRule`, `LoyaltyAccount`, `LoyaltyTransaction`, `Reward`,
`RewardRedemption`, `WalletPass`, `WalletDeviceRegistration` se alcanzan
siempre a través de su padre (`program`, `customer`, `account`, `reward`,
`walletPass`). Agregar `businessId` redundante en estas tablas introduciría
un segundo lugar donde el dato podría desincronizarse del padre. El
aislamiento multi-tenant para estos modelos se garantiza en la capa de
servicio (ver `docs/ARCHITECTURE.md`), no en la Prisma Client Extension.

## Índices

Todas las tablas tenant-scoped tienen un índice en `businessId` (y, donde
aplica, índices compuestos como `[businessId, eventType]` en `LoyaltyRule` o
`[businessId, createdAt]` en `AuditLog`) para que los filtros de tenant —que
se aplican en *cada* query— no degraden con el volumen de datos.

## Migraciones

```bash
pnpm db:migrate     # crea y aplica una migración nueva en desarrollo
pnpm db:generate    # solo regenera el Prisma Client
pnpm db:seed        # datos de ejemplo (negocio "Barberia XYZ", plan STARTER, etc.)
pnpm db:studio      # explorador visual de la base de datos
```

En producción, las migraciones se aplican con `prisma migrate deploy` (ver
`docs/DEPLOYMENT.md`), nunca con `migrate dev`.

## Datos de ejemplo (seed)

El seed (`packages/database/prisma/seed.ts`) crea:

- 3 planes: `STARTER`, `BUSINESS`, `PRO` con límites configurables en `Plan.limits` (JSON).
- Un negocio "Barbería XYZ" con su OWNER (`owner@barberiaxyz.test` / `Demo1234!`).
- Un programa "Club VIP Barbería" con 4 reglas, 4 niveles y 2 recompensas,
  replicando exactamente el ejemplo del brief original (1 visita = 1 punto,
  compra ≥ ₡10.000 = 5 puntos, cumpleaños = 10 puntos, referido = 20 puntos).
- Un cliente de ejemplo con 7 puntos acumulados.
