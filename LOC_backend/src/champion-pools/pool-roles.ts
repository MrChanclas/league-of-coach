// Same five lane keys used everywhere else in the app (Riot's teamPosition
// values — see common/role-performance.ts and common/rank-order.ts), so a
// pool entry's role lines up directly with a champion's actual played role
// (stats.getPrimaryRoleByChampion) without a translation table.
export const POOL_ROLE_KEYS = [
  'TOP',
  'JUNGLE',
  'MIDDLE',
  'BOTTOM',
  'UTILITY',
] as const;
export type PoolRoleKey = (typeof POOL_ROLE_KEYS)[number];

// Spanish labels for the five fixed slots — see handoff_loc/07-pool-champ.md
// ("Superior, Jungla, Medio, Tirador, Soporte"), distinct from the
// Top/Jungla/Medio/ADC/Support wording goalLabels.ts uses for goals.
export const POOL_ROLE_LABELS: Record<PoolRoleKey, string> = {
  TOP: 'Superior',
  JUNGLE: 'Jungla',
  MIDDLE: 'Medio',
  BOTTOM: 'Tirador',
  UTILITY: 'Soporte',
};

// A role is either untouched (0) or a real pool: at least MIN champions so a
// score/recommendation has something to work with, at most MAX so the board
// stays a "pool", not a copy of the whole roster — see user request to gate
// pool validity per role instead of a single fixed-size slot per role.
export const MIN_CHAMPIONS_PER_ROLE = 5;
export const MAX_CHAMPIONS_PER_ROLE = 10;

export function isRoleCountValid(count: number): boolean {
  return (
    count === 0 ||
    (count >= MIN_CHAMPIONS_PER_ROLE && count <= MAX_CHAMPIONS_PER_ROLE)
  );
}

export const POOL_ENTRY_STATES = ['main', 'secondary', 'testing'] as const;
export type PoolEntryState = (typeof POOL_ENTRY_STATES)[number];

export const POOL_ADDED_BY = ['player', 'coach'] as const;
export type PoolAddedBy = (typeof POOL_ADDED_BY)[number];

// champion-guides' manual-guides data writes role in Spanish, product-facing
// words that don't match Riot's teamPosition keys — this is the one place
// that translates between the two vocabularies.
const GUIDE_ROLE_TO_POOL_ROLE: Record<string, PoolRoleKey> = {
  Top: 'TOP',
  Jungla: 'JUNGLE',
  Medio: 'MIDDLE',
  ADC: 'BOTTOM',
  Support: 'UTILITY',
};

export function poolRoleFromGuideRole(role: string): PoolRoleKey {
  return GUIDE_ROLE_TO_POOL_ROLE[role] ?? 'MIDDLE';
}

export function isPoolRoleKey(value: string): value is PoolRoleKey {
  return (POOL_ROLE_KEYS as readonly string[]).includes(value);
}
