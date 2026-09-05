export const TIER_ORDER = [
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
];

export const DIVISION_ORDER = ['IV', 'III', 'II', 'I'];

const APEX_TIER_INDEX = TIER_ORDER.indexOf('MASTER');

/**
 * Comparable rank value: higher is better. Returns -1 for Unranked/unknown
 * tiers so any real rank compares above it. Master+ tiers have no division.
 */
export function rankValue(tier?: string | null, division?: string | null): number {
  const tierIndex = TIER_ORDER.indexOf((tier ?? '').toUpperCase());
  if (tierIndex < 0) return -1;

  if (tierIndex >= APEX_TIER_INDEX) {
    return tierIndex * DIVISION_ORDER.length;
  }

  const divisionIndex = DIVISION_ORDER.indexOf((division ?? '').toUpperCase());
  return tierIndex * DIVISION_ORDER.length + Math.max(divisionIndex, 0);
}

/**
 * Continuous rank score (higher is better), one tier/division step = 100
 * points, LP fills in the points within the current step. Master+ tiers
 * have no division, so LP is added directly on top of the tier's base
 * score instead of a division offset.
 */
export function rankScore(tier?: string | null, division?: string | null, lp?: number | null): number {
  const tierIndex = TIER_ORDER.indexOf((tier ?? '').toUpperCase());
  if (tierIndex < 0) return -1;

  const safeLp = Math.max(lp ?? 0, 0);

  if (tierIndex >= APEX_TIER_INDEX) {
    return tierIndex * DIVISION_ORDER.length * 100 + safeLp;
  }

  const divisionIndex = Math.max(DIVISION_ORDER.indexOf((division ?? '').toUpperCase()), 0);
  return (tierIndex * DIVISION_ORDER.length + divisionIndex) * 100 + Math.min(safeLp, 99);
}

/**
 * The 0%-reference point for a rank goal's progress bar: exactly one tier
 * below the target, at its lowest division — so the 0%-100% window always
 * spans one full tier's worth of climbing, regardless of how far below that
 * window the account currently sits (progress just clamps to 0%).
 *
 * Climbing from Grandmaster to Challenger (or beyond) is the exception:
 * since the cutoffs between Master/Grandmaster/Challenger are dynamic
 * leaderboard cuts rather than a fixed climb, any high-elo target always
 * anchors at Master/0 LP instead of "one tier below" — so a Challenger goal
 * reflects the whole high-elo climb, not just the sliver above Grandmaster.
 */
export function rankGoalAnchor(targetTier: string): { tier: string; division: string | null } {
  const targetIndex = TIER_ORDER.indexOf(targetTier.toUpperCase());

  if (targetIndex > APEX_TIER_INDEX) {
    return { tier: 'MASTER', division: null };
  }

  const belowIndex = Math.max(targetIndex - 1, 0);
  return { tier: TIER_ORDER[belowIndex], division: 'IV' };
}
