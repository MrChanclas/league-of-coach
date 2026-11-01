const DEFAULT_DEV_FRONTEND_URL = 'http://localhost:5173';

/** The frontend origins from FRONTEND_URL: who CORS and Clerk tokens accept. */
export function getAllowedOrigins(): string[] {
  return (process.env.FRONTEND_URL || DEFAULT_DEV_FRONTEND_URL)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
