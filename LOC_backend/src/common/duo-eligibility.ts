import { DIVISION_ORDER, TIER_ORDER, rankValue } from './rank-order';

export type DuoQueue = 'solo' | 'flex';

export type DuoRank = {
  tier: string;
  division: string;
  lp: number;
};

// Riot's Ranked Solo/Duo partner table, as published on
// https://support.riotgames.com/league-of-legends/gameplay/ranked-tiers-divisions-and-queues
// Each entry is the lowest and highest rank a player of that tier can queue
// with. Riot's own page renders the Diamond rows garbled, so those are a
// best reading of it — keep this table as the single place to correct them.
// Master and above are handled separately (they depend on LP, not division).
const SOLO_PARTNER_RANGE: Record<string, [string, string]> = {
  IRON: ['IRON IV', 'SILVER I'],
  BRONZE: ['IRON IV', 'SILVER I'],
  SILVER: ['IRON IV', 'GOLD I'],
  GOLD: ['SILVER IV', 'PLATINUM I'],
  PLATINUM: ['GOLD IV', 'EMERALD I'],
  EMERALD: ['PLATINUM IV', 'DIAMOND III'],
  'DIAMOND IV': ['EMERALD II', 'DIAMOND II'],
  'DIAMOND III': ['EMERALD II', 'DIAMOND II'],
  'DIAMOND II': ['EMERALD II', 'DIAMOND II'],
  'DIAMOND I': ['DIAMOND III', 'MASTER'],
};

// A Master player may duo with Diamond I only below this LP, and with
// another Master only within MASTER_LP_WINDOW of each other.
export const MASTER_WITH_DIAMOND_MAX_LP = 200;
export const MASTER_LP_WINDOW = 400;

const NO_DUO_TIERS = new Set(['GRANDMASTER', 'CHALLENGER']);

function normalize(rank: DuoRank) {
  return {
    tier: rank.tier.trim().toUpperCase(),
    division: rank.division.trim().toUpperCase(),
    lp: rank.lp,
  };
}

function valueOf(label: string) {
  const [tier, division] = label.split(' ');
  return rankValue(tier, division ?? DIVISION_ORDER[0]);
}

function isRanked(tier: string) {
  return (TIER_ORDER as readonly string[]).includes(tier);
}

function rangeAllows(self: DuoRank, other: DuoRank): boolean {
  const range =
    SOLO_PARTNER_RANGE[`${self.tier} ${self.division}`] ??
    SOLO_PARTNER_RANGE[self.tier];
  if (!range) return false;
  const value = rankValue(other.tier, other.division);
  return value >= valueOf(range[0]) && value <= valueOf(range[1]);
}

function soloAllows(a: DuoRank, b: DuoRank): boolean {
  if (NO_DUO_TIERS.has(a.tier) || NO_DUO_TIERS.has(b.tier)) return false;

  const aMaster = a.tier === 'MASTER';
  const bMaster = b.tier === 'MASTER';
  if (aMaster && bMaster) return Math.abs(a.lp - b.lp) <= MASTER_LP_WINDOW;
  if (aMaster || bMaster) {
    const master = aMaster ? a : b;
    const other = aMaster ? b : a;
    return (
      other.tier === 'DIAMOND' &&
      other.division === 'I' &&
      master.lp < MASTER_WITH_DIAMOND_MAX_LP
    );
  }

  return rangeAllows(a, b) && rangeAllows(b, a);
}

/**
 * Whether Riot lets these two ranks queue together. Unranked accounts have
 * no published range, so they're allowed with anyone below Grandmaster.
 * Flex has no restrictions up to Diamond; above it, the Solo/Duo rules are
 * applied as the conservative reading.
 */
export function canDuo(queue: DuoQueue, first: DuoRank, second: DuoRank) {
  const a = normalize(first);
  const b = normalize(second);

  if (!isRanked(a.tier) || !isRanked(b.tier)) {
    return !NO_DUO_TIERS.has(a.tier) && !NO_DUO_TIERS.has(b.tier);
  }

  if (queue === 'flex') {
    const diamondCap = rankValue('DIAMOND', 'I');
    if (
      rankValue(a.tier, a.division) <= diamondCap &&
      rankValue(b.tier, b.division) <= diamondCap
    ) {
      return true;
    }
  }

  return soloAllows(a, b);
}
