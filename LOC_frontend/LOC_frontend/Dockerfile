# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

# Vite bakes env vars into the static bundle at build time, so the backend
# URL must be known when the image is built (passed as --build-arg in CI).
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm run build

FROM nginx:1.27-alpine AS runner
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Cloud Run sets $PORT at container start; the nginx image's entrypoint runs
# envsubst on templates/*.template into conf.d/ before nginx starts.
ENV PORT=8080
EXPOSE 8080
