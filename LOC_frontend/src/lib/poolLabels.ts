import type {
  PoolEntryState,
  PoolRecommendationLabel,
  PoolRoleKey,
  PoolRoleProfile,
  PoolSlotKey,
} from '../types/dashboard'

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

export const FILL_SLOT = 'FILL' as const

export const POOL_SLOT_LABELS: Record<PoolSlotKey, string> = {
  ...POOL_ROLE_LABELS,
  FILL: 'Fill',
}

// Mismas reglas que champion-pools/pool-roles.ts en el backend: el pool solo
// ofrece la línea principal, la secundaria y un slot FILL para todo lo demás.
export function getPoolSlots(profile: PoolRoleProfile | undefined): PoolSlotKey[] {
  const slots: PoolSlotKey[] = []
  if (profile?.primaryRole) slots.push(profile.primaryRole)
  if (profile?.secondaryRole) slots.push(profile.secondaryRole)
  slots.push(FILL_SLOT)
  return slots
}

export function resolvePoolSlot(role: string, profile: PoolRoleProfile | undefined): PoolSlotKey {
  return role === profile?.primaryRole || role === profile?.secondaryRole ? (role as PoolRoleKey) : FILL_SLOT
}

// Un campeón puede estar en más de una línea, así que una entrada del pool se
// identifica por campeón + línea.
export function poolEntryKey(championKey: string, slot: PoolSlotKey): string {
  return `${championKey}|${slot}`
}

export function getPoolSlotCaption(slot: PoolSlotKey, profile: PoolRoleProfile | undefined): string {
  if (slot === FILL_SLOT) return 'Campeones fuera de tus líneas main'
  return slot === profile?.primaryRole ? 'Línea principal' : 'Línea secundaria'
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

// Copy for the per-champion "seguí así o cambiá" tip (winrate > 49% = bien,
// <= 49% = mal) — kept in sync with BAD_WINRATE_THRESHOLD in the backend's
// champion-performance.ts.
export const PERFORMANCE_TIP_GOOD_MESSAGE = 'Sigue utilizándolo'
export const PERFORMANCE_TIP_BAD_MESSAGE = 'Necesitas mejorar'
