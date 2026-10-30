# League of Coach: backend

API REST de League of Coach, hecha con NestJS 11, Prisma 7 y PostgreSQL. Gestiona las cuentas de Riot de cada usuario, sincroniza su historial de partidas desde la API de Riot y calcula las estadísticas, lecciones, objetivos y recomendaciones de pool que muestra el frontend.

## Puesta en marcha

```bash
cp .env.example .env          # completar los valores (ver abajo)
docker compose up -d          # Postgres local, con las credenciales POSTGRES_* del .env
pnpm install
pnpm exec prisma migrate dev  # aplica las migraciones y genera el cliente
pnpm run start:dev            # http://localhost:4100 con el .env de ejemplo
```

## Variables de entorno

[.env.example](.env.example) documenta cada variable. Las imprescindibles para levantar la API en local son:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión a Postgres. `DATABASE_POOL_MAX` ajusta las conexiones por instancia. |
| `CLERK_SECRET_KEY` | Verifica el token de sesión que manda el frontend. |
| `RIOT_API_KEY`, `RIOT_DEFAULT_SERVER` | Llamadas a la API de Riot. |
| `CURRENT_SEASON_START_DATE` | Inicio de la temporada actual. Riot no lo publica, así que se actualiza a mano una vez por año. |
| `FRONTEND_URL` | Orígenes permitidos por CORS, separados por coma. |
| `INTERNAL_POLL_SECRET` | Secreto de los endpoints que llama Cloud Scheduler. |

`SENTRY_DSN` y los webhooks de Discord son opcionales en local.

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm run start:dev` | API con recarga automática. |
| `pnpm run test` | Tests unitarios con Jest (`src/**/*.spec.ts`). |
| `pnpm run test:e2e` | Test end-to-end de `test/`. Necesita una base de datos. |
| `pnpm exec eslint "{src,test}/**/*.ts"` | Lint sin autocorregir, igual que en CI. `pnpm run lint` corrige solo. |
| `pnpm run build` | Compila a `dist/`. |
| `pnpm exec prisma migrate dev --name <cambio>` | Crea una migración después de editar `prisma/schema.prisma`. |

## Estructura

Cada carpeta de `src/` es un módulo de Nest con su controlador, servicio y módulo:

| Módulo | Responsabilidad |
|---|---|
| `auth` | Guard global de Clerk (`@Public()` lo omite), `AuthzService` para validar la propiedad de las cuentas y `InternalSecretGuard`. |
| `users` | Usuario interno asociado a la identidad de Clerk, y el payload del dashboard. |
| `accounts` | Cuentas de Riot vinculadas: búsqueda, alta, baja e historial de rango. |
| `riot` | Cliente de la API de Riot con throttle propio y reintentos ante 429. |
| `matches` | Sincronización de partidas: ingesta, backfill de la temporada, recuperación de partidas compartidas e historial (últimos 90 días). |
| `rank-snapshots` | Registro periódico del rango de cada cuenta. |
| `stats` | Estadísticas por cuenta, rol, campeón y cola. |
| `learning` | Lecciones generadas desde `data/lessons-knowledge-base.json` y errores detectados. |
| `goals` | Objetivos con progreso, brecha y ritmo. |
| `champion-pools` | Pool Champ: pool por línea, recomendación y rendimiento por campeón. |
| `champion-guides` | Guías por campeón (`data/manual-guides/`) y versión de Data Dragon. |
| `feedback`, `discord` | Feedback del login y alertas a Discord. Además, el filtro global de excepciones. |
| `common` | Lógica pura y constantes compartidas: colas, temporada, orden de rangos, benchmarks por rol, rate limit. |

## Seguridad y límites

- Todas las rutas exigen un token de Clerk, salvo las marcadas con `@Public()`.
- Un throttle global limita a 120 solicitudes por minuto por IP (`common/rate-limit.ts`). La app confía en un salto de proxy, el de Cloud Run, para obtener la IP real del cliente.
- `POST /internal/poll-ranks` y `POST /internal/continue-backfills` solo los llama Cloud Scheduler: requieren el header `X-Internal-Secret` y no tienen throttle.

## Scripts de mantenimiento

`scripts/backfill-role-metrics.ts` vuelve a descargar las partidas ya guardadas para completar campos de rendimiento que se agregaron después. Solo actualiza filas existentes, así que se puede correr más de una vez:

```bash
npx ts-node -r tsconfig-paths/register scripts/backfill-role-metrics.ts
```
