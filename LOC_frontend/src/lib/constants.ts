// Shared values that were previously copy-pasted across multiple files
// (rank tiers alone had three independent copies) — centralized here so a
// future change (a new tier, a renamed division) only needs to happen once.

/** Riot's ranked queue ids — the only two queues this app ever syncs or displays match history for. */
export const QUEUE_IDS = {
  SOLO: 420,
  FLEX: 440,
} as const

export const RANK_TIERS = [
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
] as const

export const APEX_TIERS = new Set<string>(['MASTER', 'GRANDMASTER', 'CHALLENGER'])

export const RANK_DIVISIONS = ['IV', 'III', 'II', 'I'] as const

export const ROLE_KEYS = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const
