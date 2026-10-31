# League of Coach

Plataforma de coaching para League of Legends. El usuario vincula sus cuentas de Riot y la app sincroniza su historial de partidas de la temporada para darle estadísticas por rol y campeón, lecciones a partir de errores detectados, objetivos con ritmo de progreso y una recomendación de pool de campeones (Pool Champ).

En producción: https://leagueofcoach.pro (API en https://api.leagueofcoach.pro).

## Stack

- **Backend** ([LOC_backend/](LOC_backend/)): NestJS 11, Prisma 7 y PostgreSQL. Autenticación con Clerk, validación con Zod, monitoreo con Sentry y alertas en Discord.
- **Frontend** ([LOC_frontend/](LOC_frontend/)): React 19, Vite, TypeScript y TanStack Query.
- **Infraestructura**: Google Cloud Run (backend y frontend), Cloud SQL (Postgres) y Cloud Scheduler para las tareas periódicas.

## Funcionalidades

- Varias cuentas de Riot por usuario, con rango por cola (Solo/Dúo y Flexible) e historial de rango.
- Sincronización del historial de la temporada, con backfill automático en segundo plano.
- Estadísticas por rol y campeón (KDA, CS, visión, participación, rendimiento frente al rival de línea).
- **Aprendizaje**: lecciones y errores detectados a partir de las últimas partidas.
- **Objetivos**: metas de rango, rol o campeón, con la brecha restante y el ritmo necesario para cerrarla.
- **Pool Champ**: pool de campeones por línea, armado a mano o a partir de la recomendación del coach.

## Estructura

```
LOC_backend/
  prisma/            Esquema y migraciones
  src/<dominio>/     Un módulo de Nest por dominio (accounts, matches, stats, goals, learning, champion-pools...)
  src/common/        Lógica pura y constantes compartidas entre módulos
LOC_frontend/src/
  components/        Componentes de React, agrupados por pantalla
  hooks/             Queries, mutations y hooks con estado (auth, sincronización, navegación)
  lib/               Funciones puras: formateo, etiquetas, cálculos de vista
  constants/         Constantes y textos estáticos compartidos
  types/             Tipos del dominio (dashboard), de props (components), de la API y de auth
  styles/            CSS por área, importado en orden desde styles/index.css
```

## Requisitos

- Node.js 22
- pnpm (se activa con `corepack enable`)
- PostgreSQL (o Docker, con el `docker-compose.yml` del backend)

## Inicio rápido

### Backend

```bash
cd LOC_backend
cp .env.example .env      # completar los valores
docker compose up -d      # Postgres local
pnpm install
pnpm exec prisma migrate dev
pnpm run start:dev
```

### Frontend

```bash
cd LOC_frontend
pnpm install
pnpm run dev
```

El frontend lee `VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY` y `VITE_SENTRY_DSN` desde su `.env`.

## Verificación y deploy

- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) corre lint, tests y build de ambas apps en cada pull request.
- [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) corre esa misma verificación en cada push a `main`. Si pasa, construye las imágenes, aplica las migraciones de Prisma y despliega en Cloud Run.

Para correr lo mismo en local:

```bash
cd LOC_backend  && pnpm exec eslint "{src,test}/**/*.ts" && pnpm run test && pnpm run build
cd LOC_frontend && pnpm run lint && pnpm run test && pnpm run build
```
