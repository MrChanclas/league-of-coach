import {
  METRIC_SCORE_CAP,
  ROLE_METRICS,
  RoleKey,
  RoleMetricKey,
  RoleMetricResult,
  scorePctFor,
} from './role-performance';

/**
 * There's no per-champion benchmark table (that would mean hand-tuning 172
 * champions x 5 role metrics), so a champion is scored against the account's
 * own average in that role instead of a static benchmark. This reuses the
 * same weighted-metric shape as role-performance.ts — a champion scoring at
 * or above the player's own role average isn't a weakness worth flagging.
 */
export type ChampionPerformance = {
  champion: string;
  role: RoleKey;
  gamesPlayed: number;
  score: number;
  metrics: RoleMetricResult[];
  weakest: RoleMetricResult | null;
};

export function computeChampionPerformance(
  champion: string,
  role: RoleKey,
  gamesPlayed: number,
  championValues: Partial<Record<RoleMetricKey, number | null>>,
  roleAverages: Partial<Record<RoleMetricKey, number | null>>,
): ChampionPerformance | null {
  const defs = ROLE_METRICS[role];

  const metrics: RoleMetricResult[] = [];
  let weightedSum = 0;
  let weightTotal = 0;

  for (const def of defs) {
    const value = championValues[def.key];
    const benchmark = roleAverages[def.key];
    if (value == null || !benchmark) continue;

    const direction = def.direction ?? 'higher';
    const scorePct = scorePctFor(direction, value, benchmark);
    metrics.push({
      key: def.key,
      label: def.label,
      unit: def.unit,
      direction,
      value,
      benchmark,
      scorePct,
    });
    weightedSum += Math.min(scorePct, METRIC_SCORE_CAP) * def.weight;
    weightTotal += def.weight;
  }

  if (weightTotal === 0) return null;

  const score = Math.round(weightedSum / weightTotal);
  const weakest = metrics.reduce((worst, metric) =>
    metric.scorePct < worst.scorePct ? metric : worst,
  );

  return { champion, role, gamesPlayed, score, metrics, weakest };
}
