import type { PoolEntryState, PoolRecommendationLabel, PoolRoleKey } from '../types/dashboard'

// Distinct wording from goalLabels.ts's ROLE_LABELS — see handoff_loc/07-pool-champ.md
// ("Superior, Jungla, Medio, Tirador, Soporte" for the five fixed pool slots).
export const POOL_ROLE_KEYS: PoolRoleKey[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']

// A role counts as a valid pool once it has at least this many champions, and
// tops out at this many so the "pool" stays a shortlist, not the whole
// roster. A role can also stay untouched (0) without invalidating the rest.
export const MIN_CHAMPIONS_PER_ROLE = 5
export const MAX_CHAMPIONS_PER_ROLE = 10

export const POOL_ROLE_LABELS: Record<PoolRoleKey, string> = {
  TOP: 'Superior',
  JUNGLE: 'Jungla',
  MIDDLE: 'Medio',
  BOTTOM: 'Tirador',
  UTILITY: 'Soporte',
}

export const POOL_STATE_LABELS: Record<PoolEntryState, string> = {
  main: 'MAIN',
  secondary: 'SECUNDARIO',
  testing: 'EN PRUEBA',
}

export const RECOMMENDATION_LABELS: Record<PoolRecommendationLabel, string> = {
  YA_TE_RINDE: 'YA TE RINDE',
  TU_ESTILO: 'TU ESTILO',
  CUBRE_HUECO: 'CUBRE HUECO',
}
