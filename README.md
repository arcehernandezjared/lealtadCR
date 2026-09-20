# LoyaltyCr

SaaS multi-tenant para programas de fidelización digital: tarjetas de lealtad
para Apple Wallet y Google Wallet, puntos, recompensas, niveles, automatizaciones
y analytics para negocios con uno o varios locales.

> **Estado actual: Fase 2 completada.** Arquitectura, base de datos completa,
> autenticación, multi-tenancy, dashboard, programas de lealtad, motor de
> reglas, clientes, visitas/compras, niveles y recompensas (con canje por
> código) están implementados y probados. QR/portal cliente (Fase 3),
> Apple/Google Wallet (Fase 4), notificaciones/automatizaciones (Fase 5) y
> analytics avanzado/suscripciones (Fase 6) siguen el plan de fases descrito
> en `docs/ARCHITECTURE.md`.

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS (`apps/web`)
- **Backend**: Node.js + Express + TypeScript, API REST modular (`apps/api`)
- **Base de datos**: PostgreSQL + Prisma (`packages/database`)
- **Compartido**: tipos, schemas de validación (zod), motor de reglas, auth utils (`packages/shared`)
- **Monorepo**: pnpm workspaces + Turborepo

## Estructura del proyecto

```
apps/
  api/            Backend Express (auth, multi-tenant, business, analytics, admin)
  web/            Frontend React (landing, login/registro, dashboard)
packages/
  database/       Prisma schema, cliente singleton, extension de aislamiento por tenant, seed
  shared/         Tipos, schemas zod, registro de eventos/acciones del motor de reglas, utils de auth
docs/             Documentación de arquitectura, base de datos, API, wallets, deployment
docker-compose.yml  Postgres local para desarrollo
```

## Requisitos

- Node.js 20+ (probado con Node 24)
- pnpm 9+ (`corepack enable` o `npm install -g pnpm`)
- Docker Desktop (para Postgres local) — o un Postgres propio

## Desarrollo local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Levantar Postgres local
docker compose up -d

# 3. Configurar variables de entorno
cp .env.example apps/api/.env
cp .env.example apps/web/.env   # solo necesitas VITE_API_BASE_URL de este archivo
# Genera secretos fuertes para JWT_ACCESS_SECRET y COOKIE_SECRET:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 4. Migrar y sembrar datos de ejemplo
pnpm db:migrate
pnpm db:seed

# 5. Levantar todo (API en :4000, web en :5173)
pnpm dev
```

Usuario de prueba tras el seed: `owner@barberiaxyz.test` / `Demo1234!`.

## Variables de entorno

Ver [.env.example](.env.example), completamente documentado. Las credenciales de
Apple Wallet y Google Wallet son opcionales hasta la Fase 4 — ver
[docs/APPLE_WALLET.md](docs/APPLE_WALLET.md) y [docs/GOOGLE_WALLET.md](docs/GOOGLE_WALLET.md).

## Tests

```bash
pnpm --filter @loyaltycr/shared test   # unitarios (hashing, codigos, roles)
pnpm --filter @loyaltycr/api test      # integracion (auth, aislamiento multi-tenant, motor de reglas/recompensas)
```

Los tests de API requieren una base de datos de test separada (`apps/api/.env.test`,
apuntando a una DB distinta de la de desarrollo) para no pisar datos locales.

## Documentación

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — arquitectura general y plan de fases
- [docs/DATABASE.md](docs/DATABASE.md) — modelo de datos y decisiones de diseño
- [docs/API.md](docs/API.md) — endpoints disponibles
- [docs/APPLE_WALLET.md](docs/APPLE_WALLET.md) — credenciales y plan de integración Apple Wallet
- [docs/GOOGLE_WALLET.md](docs/GOOGLE_WALLET.md) — credenciales y plan de integración Google Wallet
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — despliegue a producción
