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
] as const;

export const DIVISION_ORDER = ['IV', 'III', 'II', 'I'] as const;

const APEX_TIER_INDEX = TIER_ORDER.indexOf('MASTER');

/**
 * Comparable rank value: higher is better. Returns -1 for Unranked/unknown
 * tiers so any real rank compares above it. Master+ tiers have no division.
 */
export function rankValue(
  tier?: string | null,
  division?: string | null,
): number {
  const tierIndex = TIER_ORDER.indexOf(
    (tier ?? '').toUpperCase() as (typeof TIER_ORDER)[number],
  );
  if (tierIndex < 0) return -1;

  if (tierIndex >= APEX_TIER_INDEX) {
    return tierIndex * DIVISION_ORDER.length;
  }

  const divisionIndex = DIVISION_ORDER.indexOf(
    (division ?? '').toUpperCase() as (typeof DIVISION_ORDER)[number],
  );
  return tierIndex * DIVISION_ORDER.length + Math.max(divisionIndex, 0);
}

/**
 * Continuous rank score (higher is better), one tier/division step = 100
 * points, LP fills in the points within the current step. Master+ tiers
 * have no division, so LP is added directly on top of the tier's base
 * score instead of a division offset.
 *
 * Master, Grandmaster, and Challenger all share the SAME base score (the
 * apex tier's own, not each tier's own index): a player's LP does not reset
 * when Riot relabels them from Master to Grandmaster to Challenger — it's
 * one continuous number, and the tier label is just where that number
 * currently sits relative to the live leaderboard cutoffs. Using each
 * tier's own index here would silently add a fake +400 (or +800) to the
 * score on every apex promotion, which previously showed goals as needing
 * ~400 more LP than they actually did.
 */
export function rankScore(
  tier?: string | null,
  division?: string | null,
  lp?: number | null,
): number {
  const tierIndex = TIER_ORDER.indexOf(
    (tier ?? '').toUpperCase() as (typeof TIER_ORDER)[number],
  );
  if (tierIndex < 0) return -1;

  const safeLp = Math.max(lp ?? 0, 0);

  if (tierIndex >= APEX_TIER_INDEX) {
    return APEX_TIER_INDEX * DIVISION_ORDER.length * 100 + safeLp;
  }

  const divisionIndex = Math.max(
    DIVISION_ORDER.indexOf(
      (division ?? '').toUpperCase() as (typeof DIVISION_ORDER)[number],
    ),
    0,
  );
  return (
    (tierIndex * DIVISION_ORDER.length + divisionIndex) * 100 +
    Math.min(safeLp, 99)
  );
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
export function rankGoalAnchor(targetTier: string): {
  tier: string;
  division: string | null;
} {
  const targetIndex = TIER_ORDER.indexOf(
    targetTier.toUpperCase() as (typeof TIER_ORDER)[number],
  );

  if (targetIndex > APEX_TIER_INDEX) {
    return { tier: 'MASTER', division: null };
  }

  const belowIndex = Math.max(targetIndex - 1, 0);
  return { tier: TIER_ORDER[belowIndex], division: 'IV' };
}
