# Deployment — LoyaltyCr

## Topología recomendada

| Componente | Plataforma sugerida | Notas |
|---|---|---|
| `apps/web` | Vercel | Build estático (Vite). Configura `VITE_API_BASE_URL` apuntando al API en producción. |
| `apps/api` | Railway / Render / VPS con Docker | Necesita un proceso long-running (no serverless puro) por los cron jobs de automatizaciones planeados en la Fase 5. |
| PostgreSQL | Railway / Neon / Supabase / RDS | Cualquier Postgres gestionado 14+. |

## Variables de entorno en producción

- **Nunca** commitear `.env` real al repositorio (`.gitignore` ya lo excluye).
- Configura cada variable de [`.env.example`](../.env.example) directamente
  en el panel de la plataforma (Railway/Render/Vercel tienen su propio
  gestor de secretos).
- `JWT_ACCESS_SECRET` y `COOKIE_SECRET` deben ser distintos entre entornos
  (dev/staging/producción) y generados con
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- `NODE_ENV=production` habilita: cookies `secure`, logging JSON estructurado
  (sin `pino-pretty`), y deshabilita el modo verbose de Prisma.
- `WEB_BASE_URL` en el API debe apuntar al dominio real del frontend (se usa
  para CORS y para construir los links de los emails transaccionales).

## Build

```bash
pnpm build   # corre `turbo run build` en todo el monorepo
```

- `apps/api`: compila TypeScript a `dist/`, se ejecuta con
  `node dist/server.js`. Antes de arrancar, correr
  `pnpm --filter @loyaltycr/database exec prisma migrate deploy`
  (nunca `migrate dev` en producción — `migrate dev` puede resetear la DB en
  ciertos flujos y no está pensado para entornos no interactivos).
- `apps/web`: `vite build` genera `apps/web/dist`, servible como sitio estático.

## Checklist antes de desplegar

- [ ] Migraciones de Prisma aplicadas (`prisma migrate deploy`) contra la DB de producción.
- [ ] `JWT_ACCESS_SECRET` / `COOKIE_SECRET` únicos y no reutilizados de desarrollo.
- [ ] `EMAIL_PROVIDER` configurado a un proveedor real (no `console`) o los
      emails de verificación/reset de password no llegarán a nadie.
- [ ] CORS (`WEB_BASE_URL` en el API) apunta al dominio real del frontend.
- [ ] Rate limiting (`apps/api/src/middleware/rate-limit.middleware.ts`)
      revisado según el tráfico esperado.
- [ ] Backups automáticos configurados en el proveedor de Postgres.
- [ ] Variables de Apple/Google Wallet configuradas **solo** si la Fase 4 ya
      está implementada y probada (ver docs/APPLE_WALLET.md y docs/GOOGLE_WALLET.md).

## Salud del servicio

El API expone `GET /health` (sin autenticación) para health checks de la
plataforma de hosting.
