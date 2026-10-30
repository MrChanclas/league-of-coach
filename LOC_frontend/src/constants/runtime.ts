export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4100').replace(/\/$/, '')

export const DDRAGON_HOST = 'https://ddragon.leagueoflegends.com'
export const RANK_EMBLEM_BASE =
  'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem'

// Keep in sync with FALLBACK_VERSION in the backend's data-dragon.service.ts.
export const FALLBACK_DDRAGON_VERSION = '16.18.1'
