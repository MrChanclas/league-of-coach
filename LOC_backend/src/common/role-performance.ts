export const ROLE_KEYS = [
  'TOP',
  'JUNGLE',
  'MIDDLE',
  'BOTTOM',
  'UTILITY',
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];
export type RankBand = 'LOW' | 'MID' | 'HIGH';
export type RoleMetricKey =
  | 'csPerMin'
  | 'teamDamagePercentage'
  | 'deathsAvg'
  | 'killParticipation'
  | 'objectiveParticipation'
  | 'maxLevelLeadLaneOpponent'
  | 'soloKillDeathRatio'
  | 'turretTakedowns'
  | 'maxCsAdvantageOnLaneOpponent'
  | 'visionScorePerMin'
  | 'controlWardsPerMin';
export type MetricUnit = 'perMin' | 'pct' | 'count';
export type MetricDirection = 'higher' | 'lower';

type MetricDef = {
  key: RoleMetricKey;
  label: string;
  weight: number;
  unit: MetricUnit;
  // 'lower' for metrics where less is better (e.g. deaths) — scored as
  // benchmark/value instead of value/benchmark. Defaults to 'higher'.
  direction?: MetricDirection;
};

/**
 * Winrate says nothing about role mastery on its own — a support and an ADC
 * can share the same winrate while doing completely different jobs. Each
 * role is instead scored on the 2-3 stats that actually differentiate good
 * play in that role, weighted by how much that stat matters for the role
 * (the heaviest-weighted stat is the one that most defines "good at this
 * role"). All of these come straight from Riot's per-participant challenges
 * object or team objective totals — no match timeline parsing required;
 * "Roam/Map Impact" was considered but dropped because Riot has no field for
 * it (it would need frame-by-frame position data from the timeline API).
 */
export const ROLE_METRICS: Record<RoleKey, MetricDef[]> = {
  TOP: [
    {
      key: 'soloKillDeathRatio',
      label: 'Solo Kills / Muertes',
      weight: 0.4,
      unit: 'count',
    },
    {
      key: 'maxLevelLeadLaneOpponent',
      label: 'Ventaja de nivel vs. rival de línea',
      weight: 0.35,
      unit: 'count',
    },
    {
      key: 'turretTakedowns',
      label: 'Torres botadas',
      weight: 0.25,
      unit: 'count',
    },
  ],
  JUNGLE: [
    {
      key: 'killParticipation',
      label: 'Participación en kills',
      weight: 0.4,
      unit: 'pct',
    },
    {
      key: 'objectiveParticipation',
      label: 'Participación en objetivos',
      weight: 0.35,
      unit: 'pct',
    },
    {
      key: 'maxCsAdvantageOnLaneOpponent',
      label: 'Ventaja de CS en la jungla vs. jungla rival',
      weight: 0.25,
      unit: 'count',
    },
  ],
  MIDDLE: [
    {
      key: 'maxCsAdvantageOnLaneOpponent',
      label: 'Ventaja de CS vs. rival de línea',
      weight: 0.35,
      unit: 'count',
    },
    {
      key: 'killParticipation',
      label: 'Participación en kills',
      weight: 0.35,
      unit: 'pct',
    },
    {
      key: 'teamDamagePercentage',
      label: '% de daño del equipo',
      weight: 0.3,
      unit: 'pct',
    },
  ],
  BOTTOM: [
    { key: 'csPerMin', label: 'CS/min', weight: 0.4, unit: 'perMin' },
    {
      key: 'teamDamagePercentage',
      label: '% de daño del equipo',
      weight: 0.35,
      unit: 'pct',
    },
    {
      key: 'deathsAvg',
      label: 'Muertes promedio',
      weight: 0.25,
      unit: 'count',
      direction: 'lower',
    },
  ],
  UTILITY: [
    {
      key: 'killParticipation',
      label: 'Participación en kills',
      weight: 0.4,
      unit: 'pct',
    },
    {
      key: 'visionScorePerMin',
      label: 'Visión/min',
      weight: 0.35,
      unit: 'perMin',
    },
    {
      key: 'controlWardsPerMin',
      label: 'Control wards/min',
      weight: 0.25,
      unit: 'perMin',
    },
  ],
};

/**
 * Seed benchmarks: reasonable approximations of "good for this band" based on
 * general, publicly-known LoL role stats (not yet calibrated against this
 * app's own users). They're deliberately a fixed table, not a magic
 * constant buried in the scoring code, so they're easy to find and tune —
 * and, eventually, easy to swap for percentiles computed from this app's own
 * match data per role/band once enough volume exists.
 */
export const ROLE_BENCHMARKS: Record<
  RoleKey,
  Record<RankBand, Partial<Record<RoleMetricKey, number>>>
> = {
  TOP: {
    LOW: {
      soloKillDeathRatio: 0.15,
      maxLevelLeadLaneOpponent: 0.5,
      turretTakedowns: 0.4,
    },
    MID: {
      soloKillDeathRatio: 0.25,
      maxLevelLeadLaneOpponent: 1.0,
      turretTakedowns: 0.7,
    },
    HIGH: {
      soloKillDeathRatio: 0.35,
      maxLevelLeadLaneOpponent: 1.5,
      turretTakedowns: 1.0,
    },
  },
  JUNGLE: {
    LOW: {
      killParticipation: 0.55,
      objectiveParticipation: 0.35,
      maxCsAdvantageOnLaneOpponent: 5,
    },
    MID: {
      killParticipation: 0.65,
      objectiveParticipation: 0.45,
      maxCsAdvantageOnLaneOpponent: 10,
    },
    HIGH: {
      killParticipation: 0.75,
      objectiveParticipation: 0.55,
      maxCsAdvantageOnLaneOpponent: 15,
    },
  },
  MIDDLE: {
    LOW: {
      maxCsAdvantageOnLaneOpponent: 8,
      killParticipation: 0.5,
      teamDamagePercentage: 0.22,
    },
    MID: {
      maxCsAdvantageOnLaneOpponent: 15,
      killParticipation: 0.6,
      teamDamagePercentage: 0.25,
    },
    HIGH: {
      maxCsAdvantageOnLaneOpponent: 22,
      killParticipation: 0.7,
      teamDamagePercentage: 0.28,
    },
  },
  BOTTOM: {
    LOW: { csPerMin: 6.0, teamDamagePercentage: 0.24, deathsAvg: 6.0 },
    MID: { csPerMin: 7.5, teamDamagePercentage: 0.27, deathsAvg: 5.0 },
    HIGH: { csPerMin: 9.0, teamDamagePercentage: 0.3, deathsAvg: 4.0 },
  },
  UTILITY: {
    LOW: {
      killParticipation: 0.5,
      visionScorePerMin: 1.4,
      controlWardsPerMin: 0.1,
    },
    MID: {
      killParticipation: 0.6,
      visionScorePerMin: 1.8,
      controlWardsPerMin: 0.15,
    },
    HIGH: {
      killParticipation: 0.7,
      visionScorePerMin: 2.2,
      controlWardsPerMin: 0.2,
    },
  },
};

/**
 * Three bands instead of one per tier: Hierro-Oro (LOW), Platino-Diamante
 * (MID), Master+ (HIGH). Coarser bands need less data per bucket to stay
 * meaningful while this benchmark table is still a static seed rather than
 * something computed from real per-division sample sizes.
 */
export function getRankBand(tier?: string | null): RankBand {
  const normalized = (tier ?? '').toUpperCase();
  if (
    normalized === 'PLATINUM' ||
    normalized === 'EMERALD' ||
    normalized === 'DIAMOND'
  )
    return 'MID';
  if (
    normalized === 'MASTER' ||
    normalized === 'GRANDMASTER' ||
    normalized === 'CHALLENGER'
  )
    return 'HIGH';
  return 'LOW';
}

export type RoleMetricResult = {
  key: RoleMetricKey;
  label: string;
  unit: MetricUnit;
  direction: MetricDirection;
  value: number;
  benchmark: number;
  scorePct: number;
};

export type RolePerformance = {
  role: RoleKey;
  band: RankBand;
  gamesPlayed: number;
  score: number;
  metrics: RoleMetricResult[];
  weakest: RoleMetricResult | null;
};

// Caps a single metric's contribution to the composite so one standout stat
// can't fully mask the others being below benchmark.
const METRIC_SCORE_CAP = 130;

function scorePctFor(
  direction: MetricDirection,
  value: number,
  benchmark: number,
): number {
  if (direction === 'lower') {
    // Fewer than the benchmark (e.g. deaths) scores above 100%; guard
    // against a divide-by-zero explosion when value is 0.
    return (benchmark / Math.max(value, 0.01)) * 100;
  }
  return (value / benchmark) * 100;
}

export function computeRolePerformance(
  role: RoleKey,
  band: RankBand,
  gamesPlayed: number,
  values: Partial<Record<RoleMetricKey, number | null>>,
): RolePerformance {
  const defs = ROLE_METRICS[role];
  const benchmarks = ROLE_BENCHMARKS[role][band];

  const metrics: RoleMetricResult[] = [];
  let weightedSum = 0;
  let weightTotal = 0;

  for (const def of defs) {
    const value = values[def.key];
    const benchmark = benchmarks[def.key];
    // Missing data (e.g. a stat added after this match was synced) drops the
    // metric instead of counting it as 0 — the remaining metrics' weights
    // are renormalized below.
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

  const score =
    gamesPlayed > 0 && weightTotal > 0
      ? Math.round(weightedSum / weightTotal)
      : 0;
  const weakest = metrics.length
    ? metrics.reduce((worst, metric) =>
        metric.scorePct < worst.scorePct ? metric : worst,
      )
    : null;

  return { role, band, gamesPlayed, score, metrics, weakest };
}

function formatMagnitude(delta: number, unit: MetricUnit): string {
  if (unit === 'pct') return `${Math.round(delta * 100)}%`;
  return Math.abs(delta - Math.round(delta)) < 0.05
    ? String(Math.round(delta))
    : delta.toFixed(1);
}

export function formatMetricDelta(metric: RoleMetricResult): string {
  const delta =
    metric.direction === 'lower'
      ? metric.value - metric.benchmark
      : metric.benchmark - metric.value;
  if (delta <= 0) return `${metric.label} ya está en nivel`;
  const sign = metric.direction === 'lower' ? '-' : '+';
  return `${sign}${formatMagnitude(delta, metric.unit)} en ${metric.label}`;
}
