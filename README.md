# League of Coach

Aplicación web para gestionar cuentas de League of Legends, objetivos de aprendizaje y progreso personal por campeón y rol.

## Stack

- Backend: NestJS + Prisma + PostgreSQL
- Frontend: React + Vite + TypeScript

## Estructura

- `LOC_backend/loc_backend/` - API REST y modelo de datos
- `LOC_frontend/LOC_frontend/` - aplicación frontend

## Requisitos

- Node.js 18+
- npm o pnpm
- PostgreSQL

## Inicio rápido

### Backend

```bash
cd LOC_backend/loc_backend
npm install
cp .env.example .env
npm run start:dev
```

### Frontend

```bash
cd LOC_frontend/LOC_frontend
npm install
npm run dev
```

## Variables de entorno

Configura una base de datos PostgreSQL con la variable:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/leagueofcoach"
```

## Funcionalidades principales

- Múltiples cuentas LOL por usuario
- Usuarios internos de la plataforma
- Aprendizaje manual por campeón y rol
- Comparación de progreso con métricas actuales
- Objetivos personales por división, rol y campeón

## Estado del proyecto

Proyecto base en fase MVP con backend funcional y dashboard inicial.
