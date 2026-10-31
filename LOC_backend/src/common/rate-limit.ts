// Per-IP request budget applied to every endpoint by ThrottlerGuard. It's
// sized well above what the dashboard needs (a full account switch fires
// about a dozen queries, and the season sync loop calls one endpoint per
// round) so it only bites on floods: a script hammering the public routes or
// burning the shared Riot API key through account search and sync.
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const RATE_LIMIT_MAX_REQUESTS = 120;

export const RATE_LIMIT_MESSAGE =
  'Demasiadas solicitudes seguidas. Espera un momento e intenta de nuevo.';

// Cloud Run puts one proxy hop (Google Front End) between the client and the
// container. Without trusting it, request.ip is the proxy's address, so every
// user shares one "IP" and per-IP limits act as a single global limit.
export const TRUSTED_PROXY_HOPS = 1;
