# League of Coach: frontend

Dashboard de League of Coach, hecho con React 19, Vite y TypeScript. El login usa Clerk, los datos llegan de la API con TanStack Query y los errores se reportan a Sentry.

## Puesta en marcha

```bash
cp .env.example .env   # completar los valores
pnpm install
pnpm run dev           # http://localhost:5173
```

El backend tiene que estar corriendo en la URL de `VITE_API_URL`.

## Variables de entorno

| Variable | Para qué |
|---|---|
| `VITE_API_URL` | URL base de la API (en local, `http://localhost:4100`). |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clave pública de Clerk. |
| `VITE_SENTRY_DSN` | DSN de Sentry. Es opcional en local. |

Vite fija estas variables dentro del bundle al compilar. En producción se pasan como `--build-arg` al construir la imagen de Docker (ver `.github/workflows/deploy.yml`).

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm run dev` | Servidor de desarrollo. |
| `pnpm run test` | Tests con Vitest (`src/**/*.test.ts`). |
| `pnpm run lint` | ESLint. |
| `pnpm run build` | Chequeo de tipos y build de producción en `dist/`. |

## Dónde va cada cosa

| Carpeta | Contenido |
|---|---|
| `components/` | Solo componentes de React, agrupados por pantalla (`accounts`, `matches`, `learning`, `goals`, `poolchamp`, `auth`, `onboarding`, `layout`, `shared`). |
| `hooks/` | Queries y mutations de la API (`useApiQueries`, `useApiMutations`) y hooks con estado: `useAuthFlow`, `useMatchSync`, `useTabNavigation`, `useStatusMessage`. |
| `lib/` | Funciones puras: formateo, etiquetas y cálculos de vista. Son las que tienen tests. |
| `constants/` | Constantes y textos estáticos compartidos (`index.ts`), claves de TanStack Query (`queryKeys.ts`) y variables de entorno (`runtime.ts`). |
| `types/` | `dashboard.ts` para el dominio, `components.ts` para las props, `api.ts` para requests y respuestas, más `auth.ts` y `onboarding.ts`. |
| `styles/` | CSS por área, importado desde `styles/index.css`. Los colores son tokens definidos en `tokens.css`. |

Algunas convenciones:

- Si un componente necesita un tipo, una constante o una función pura, esa pieza va en `types/`, `constants/` o `lib/`, no dentro del componente.
- Un valor que se repite en varios lugares se centraliza solo cuando representa el mismo dato. Si dos valores coinciden por casualidad, quedan separados.
- Todo el texto visible en la app va en español neutro, sin voseo.
- Los colores salen de los tokens (`var(--hf-...)`), no de valores hex sueltos.
- El orden de los `@import` en `styles/index.css` importa: reproduce la cascada original y `responsive.css` sobrescribe reglas de archivos anteriores.
