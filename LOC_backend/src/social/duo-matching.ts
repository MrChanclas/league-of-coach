import { rankGoalAnchor, rankScore, rankValue } from '../common/rank-order';

export type DuoCard = {
  roles: string[];
  lookingFor: string[];
  availability: string[];
  rank: { tier: string; division: string; lp: number };
  // The open rank goal of the searching account in this queue, if any.
  rankGoal: { tier: string; division: string | null } | null;
};

export type DuoMatch = {
  score: number;
  // The candidate plays a line I'm looking for.
  playsWhatIWant: boolean;
  // I play a line the candidate is looking for.
  wantsWhatIPlay: boolean;
  sharedGoal: { tier: string; division: string | null } | null;
  sharedAvailability: string[];
};

// Weights for ranking candidates. Role fit dominates: a duo that can't cover
// each other's lanes rarely sticks. Each rank step of distance (one
// division) costs a little, so equal fits sort the closest elo first.
const WEIGHT_PLAYS_WHAT_I_WANT = 4;
const WEIGHT_WANTS_WHAT_I_PLAY = 4;
const WEIGHT_SAME_GOAL = 5;
const WEIGHT_PER_SHARED_SLOT = 1;
const PENALTY_PER_RANK_STEP = 0.5;

function overlaps(a: string[], b: string[]) {
  return a.some((value) => b.includes(value));
}

function sameGoal(a: DuoCard['rankGoal'], b: DuoCard['rankGoal']) {
  return Boolean(
    a &&
    b &&
    a.tier === b.tier &&
    (a.division ?? null) === (b.division ?? null),
  );
}

/** How well a candidate fits me; higher is better. Pure — see the spec. */
export function scoreDuoMatch(me: DuoCard, candidate: DuoCard): DuoMatch {
  const playsWhatIWant = overlaps(me.lookingFor, candidate.roles);
  const wantsWhatIPlay = overlaps(candidate.lookingFor, me.roles);
  const sharedGoal = sameGoal(me.rankGoal, candidate.rankGoal)
    ? me.rankGoal
    : null;
  const sharedAvailability = me.availability.filter((slot) =>
    candidate.availability.includes(slot),
  );

  const myValue = rankValue(me.rank.tier, me.rank.division);
  const theirValue = rankValue(candidate.rank.tier, candidate.rank.division);
  const rankSteps =
    myValue >= 0 && theirValue >= 0 ? Math.abs(myValue - theirValue) : 0;

  const score =
    (playsWhatIWant ? WEIGHT_PLAYS_WHAT_I_WANT : 0) +
    (wantsWhatIPlay ? WEIGHT_WANTS_WHAT_I_PLAY : 0) +
    (sharedGoal ? WEIGHT_SAME_GOAL : 0) +
    sharedAvailability.length * WEIGHT_PER_SHARED_SLOT -
    rankSteps * PENALTY_PER_RANK_STEP;

  return {
    score,
    playsWhatIWant,
    wantsWhatIPlay,
    sharedGoal,
    sharedAvailability,
  };
}

export type RankGoalProgress = {
  progress: number;
  completed: boolean;
  lpRemaining: number | null;
};

/**
 * Progress of one partner toward the duo's shared rank goal. Same model as
 * individual rank goals (goals.service.ts): absolute position on the ladder
 * over one tier's worth of climbing, completion only when Riot reports the
 * target rank — never from LP alone.
 */
export function rankGoalProgress(
  current: { tier: string; division: string; lp: number },
  target: { tier: string; division: string | null },
): RankGoalProgress {
  const currentValue = rankValue(current.tier, current.division);
  const completed =
    currentValue >= 0 &&
    currentValue >= rankValue(target.tier, target.division);
  if (completed) return { progress: 100, completed: true, lpRemaining: null };

  const anchor = rankGoalAnchor(target.tier);
  const anchorScore = rankScore(anchor.tier, anchor.division, 0);
  const targetScore = rankScore(target.tier, target.division, 0);
  const currentScore = rankScore(current.tier, current.division, current.lp);
  const span = targetScore - anchorScore;
  const raw = span > 0 ? ((currentScore - anchorScore) / span) * 100 : 0;

  return {
    progress: Math.min(Math.max(Math.round(raw), 0), 99),
    completed: false,
    lpRemaining:
      currentValue >= 0
        ? Math.max(Math.round(targetScore - currentScore), 1)
        : null,
  };
}
