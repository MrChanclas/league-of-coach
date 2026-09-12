import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
import {
  deriveRoleProfile,
  roleMatchesProfile,
  RoleProfile,
} from '../common/role-profile';
import {
  getRankBand,
  ROLE_BENCHMARKS,
  RankBand,
  RoleKey,
  RoleMetricKey,
} from '../common/role-performance';
import knowledgeBaseFile from './data/lessons-knowledge-base.json';

const MAX_LESSONS = 6;
const RECENT_GAMES_WINDOW = 5;

// Priority is computed, not hand-picked per entry: every MENTALIDAD lesson
// (tilt, streaks, role-spread) is inherently urgent regardless of sample
// size, so it's always HIGH. Everything else starts LOW and climbs as the
// same problem keeps showing up across games — MEDIUM at 5 occurrences, HIGH
// at 10 — so a fluke bad game doesn't outrank a recurring one.
const PRIORITY = { LOW: 30, MEDIUM: 60, HIGH: 90 } as const;
const MEDIUM_OCCURRENCE_THRESHOLD = 5;
const HIGH_OCCURRENCE_THRESHOLD = 10;
const MENTAL_TAG = 'MENTALIDAD';

function resolvePriority(tag: string, occurrences: number): number {
  if (tag === MENTAL_TAG) return PRIORITY.HIGH;
  if (occurrences >= HIGH_OCCURRENCE_THRESHOLD) return PRIORITY.HIGH;
  if (occurrences >= MEDIUM_OCCURRENCE_THRESHOLD) return PRIORITY.MEDIUM;
  return PRIORITY.LOW;
}

type LessonCondition = {
  operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq';
  value?: number;
  minGames?: number;
  streakType?: 'win' | 'loss';
  minCount?: number;
  // Deaths-per-minute floor a single game must hit to count as a "running it
  // down" game — used by highDeathRateGames, where `value`/`operator` judge
  // how many such games showed up in the recent window instead.
  perMinuteThreshold?: number;
  // When set, the threshold isn't the static `value` above — it's looked up
  // from ROLE_BENCHMARKS for the entry's single roleScope role and the
  // account's own rank band (LOW/MID/HIGH), so "bad CS/min" means something
  // different for an Iron player than a Diamond one. `value` still applies
  // as a fallback if that specific role/metric/band isn't in the table.
  benchmarkMetric?: RoleMetricKey;
};

type LessonKnowledgeEntry = {
  id: string;
  tag: string;
  // 'champion' lessons carry a championKey and get the matching champion
  // guide attached on the lesson detail screen (see champion-guides module
  // and handoff_loc/06-coaching.md). Omitted for every other lesson kind.
  kind?: 'champion';
  metric: string;
  roleScope?: string[];
  condition: LessonCondition;
  title: string;
  body: string;
  mediaType: string;
};

type Metrics = {
  avgCsPerMin: number;
  avgKills: number;
  avgDeaths: number;
  avgKda: number;
  avgVisionScore: number;
  avgVisionScorePerMin: number;
  avgTurretTakedowns: number;
  turretTakedownsSamples: number;
  avgObjectiveParticipation: number;
  objectiveParticipationSamples: number;
  peelDeathsTracked: number;
  peelDeathsUnguarded: number;
  peelUnguardedGamesCount: number;
  midRoamFramesTracked: number;
  midRoamFramesAway: number;
  teleportGamesTracked: number;
  teleportUnusedGames: number;
  recentDeathRates: number[];
  // Per-game breakdowns used only to count how many games showed the same
  // problem, for priority tiering — the pass/fail decision above still uses
  // the account-wide averages so this never changes which lessons trigger.
  csPerMinValues: number[];
  killCsRatioValues: number[];
  visionPerMinValues: number[];
  kdaValues: number[];
  turretTakedownValues: number[];
  objectiveParticipationValues: number[];
  midRoamAwayRatioValues: number[];
  recentKdaValues: number[];
  rankBand: RankBand;
  roleProfile: RoleProfile;
  lanes: Array<{ lane: string; games: number; share: number }>;
  streak: { type: 'win' | 'loss' | 'none'; count: number };
  recentKda: number;
  championStats: Array<{
    champion: string;
    gamesPlayed: number;
    winrate: number;
    avgKda: number;
  }>;
};

type EvaluatorResult = {
  matched: boolean;
  vars: Record<string, string | number>;
  // How many individual games exhibited this problem — drives priority
  // tiering in resolvePriority. Omitted (defaults to 0) for metrics with no
  // natural per-game repeat count, which just stay at the LOW baseline.
  occurrences?: number;
};
type Evaluator = (
  metrics: Metrics,
  entry: LessonKnowledgeEntry,
) => EvaluatorResult;

type LessonCard = {
  tag: string;
  title: string;
  body: string;
  mediaType: string;
  priority: number;
  kind?: 'champion';
  championKey?: string;
  // Structured numbers behind a 'champion' lesson — the diagnosis band on the
  // lesson detail screen shows these against the account's overall averages
  // instead of re-deriving them from the rendered text.
  championGamesPlayed?: number;
  championWinrate?: number;
  championAvgKda?: number;
};

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function compare(value: number, condition: LessonCondition) {
  const target = condition.value ?? 0;
  switch (condition.operator) {
    case 'lt':
      return value < target;
    case 'lte':
      return value <= target;
    case 'gt':
      return value > target;
    case 'gte':
      return value >= target;
    case 'eq':
      return value === target;
    default:
      return false;
  }
}

function countMatches(values: number[], condition: LessonCondition): number {
  return values.filter((value) => compare(value, condition)).length;
}

/**
 * Swaps in the rank-band-appropriate threshold when the entry asks for one
 * (see LessonCondition.benchmarkMetric) — every other condition field
 * (operator, minGames, ...) passes through untouched. Falls back to the
 * static `value` if the entry's role isn't in ROLE_BENCHMARKS for that
 * metric, so a typo or an uncovered role/metric combo degrades to the old
 * static behavior instead of silently comparing against 0.
 */
function resolveCondition(
  entry: LessonKnowledgeEntry,
  rankBand: RankBand,
): LessonCondition {
  const metric = entry.condition.benchmarkMetric;
  if (!metric) return entry.condition;

  const role = entry.roleScope?.[0] as RoleKey | undefined;
  const benchmark = role ? ROLE_BENCHMARKS[role][rankBand][metric] : undefined;
  if (benchmark == null) return entry.condition;

  return { ...entry.condition, value: benchmark };
}

function interpolate(template: string, vars: Record<string, string | number>) {
  return template.replace(/{{(\w+)}}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : '',
  );
}

const EVALUATORS: Record<string, Evaluator> = {
  avgCsPerMin: (metrics, entry) => {
    const condition = resolveCondition(entry, metrics.rankBand);
    return {
      matched: compare(metrics.avgCsPerMin, condition),
      vars: {
        avgCsPerMin: metrics.avgCsPerMin.toFixed(1),
        benchmark: condition.value ?? 0,
      },
      occurrences: countMatches(metrics.csPerMinValues, condition),
    };
  },
  killParticipationVsCsRatio: (metrics, entry) => {
    const ratio =
      metrics.avgCsPerMin > 0 ? metrics.avgKills / metrics.avgCsPerMin : 0;
    return {
      matched: compare(ratio, entry.condition),
      vars: {
        avgKills: metrics.avgKills.toFixed(1),
        avgCsPerMin: metrics.avgCsPerMin.toFixed(1),
      },
      occurrences: countMatches(metrics.killCsRatioValues, entry.condition),
    };
  },
  avgVisionScorePerMin: (metrics, entry) => {
    const condition = resolveCondition(entry, metrics.rankBand);
    return {
      matched: compare(metrics.avgVisionScorePerMin, condition),
      vars: {
        avgVisionScore: metrics.avgVisionScore.toFixed(1),
        avgVisionScorePerMin: metrics.avgVisionScorePerMin.toFixed(2),
      },
      occurrences: countMatches(metrics.visionPerMinValues, condition),
    };
  },
  avgKda: (metrics, entry) => ({
    matched: compare(metrics.avgKda, entry.condition),
    vars: { avgKda: metrics.avgKda.toFixed(2) },
    occurrences: countMatches(metrics.kdaValues, entry.condition),
  }),
  championWinrateWithMinGames: (metrics, entry): EvaluatorResult => {
    const hit = metrics.championStats.find(
      (champion) =>
        champion.gamesPlayed >= (entry.condition.minGames ?? 0) &&
        compare(champion.winrate, entry.condition),
    );
    if (!hit) {
      return {
        matched: false,
        vars: {},
      };
    }
    return {
      matched: true,
      vars: {
        champion: hit.champion,
        championWinrate: Math.round(hit.winrate * 100),
        championGames: hit.gamesPlayed,
      },
      occurrences: hit.gamesPlayed,
    };
  },
  currentStreak: (metrics, entry) => {
    const matched =
      metrics.streak.type === entry.condition.streakType &&
      metrics.streak.count >= (entry.condition.minCount ?? 0);
    return { matched, vars: { streakCount: metrics.streak.count } };
  },
  rolesPlayedCount: (metrics, entry) => {
    const minGames = entry.condition.minGames ?? 1;
    const rolesPlayed = metrics.lanes.filter(
      (lane) => lane.lane !== 'UNKNOWN' && lane.games >= minGames,
    ).length;
    return {
      matched: compare(rolesPlayed, entry.condition),
      vars: { rolesPlayedCount: rolesPlayed },
    };
  },
  avgTurretTakedowns: (metrics, entry): EvaluatorResult => {
    if (metrics.turretTakedownsSamples === 0) {
      return { matched: false, vars: {} };
    }
    const condition = resolveCondition(entry, metrics.rankBand);
    return {
      matched: compare(metrics.avgTurretTakedowns, condition),
      vars: { avgTurretTakedowns: metrics.avgTurretTakedowns.toFixed(2) },
      occurrences: countMatches(metrics.turretTakedownValues, condition),
    };
  },
  avgObjectiveParticipation: (metrics, entry): EvaluatorResult => {
    if (metrics.objectiveParticipationSamples === 0) {
      return { matched: false, vars: {} };
    }
    const condition = resolveCondition(entry, metrics.rankBand);
    return {
      matched: compare(metrics.avgObjectiveParticipation, condition),
      vars: {
        avgObjectiveParticipation: Math.round(
          metrics.avgObjectiveParticipation * 100,
        ),
      },
      occurrences: countMatches(
        metrics.objectiveParticipationValues,
        condition,
      ),
    };
  },
  midRoamAwayRatio: (metrics, entry): EvaluatorResult => {
    const minFrames = entry.condition.minGames ?? 1;
    if (metrics.midRoamFramesTracked < minFrames) {
      return { matched: false, vars: {} };
    }
    const ratio =
      metrics.midRoamFramesTracked > 0
        ? metrics.midRoamFramesAway / metrics.midRoamFramesTracked
        : 0;
    return {
      matched: compare(ratio, entry.condition),
      vars: { midRoamAwayPct: Math.round(ratio * 100) },
      occurrences: countMatches(
        metrics.midRoamAwayRatioValues,
        entry.condition,
      ),
    };
  },
  unusedTeleportRatio: (metrics, entry): EvaluatorResult => {
    const minGames = entry.condition.minGames ?? 1;
    if (metrics.teleportGamesTracked < minGames) {
      return { matched: false, vars: {} };
    }
    const ratio = metrics.teleportUnusedGames / metrics.teleportGamesTracked;
    return {
      matched: compare(ratio, entry.condition),
      vars: {
        unusedTeleportPct: Math.round(ratio * 100),
        teleportUnusedGames: metrics.teleportUnusedGames,
        teleportGamesTracked: metrics.teleportGamesTracked,
      },
      occurrences: metrics.teleportUnusedGames,
    };
  },
  peelUnguardedRatio: (metrics, entry): EvaluatorResult => {
    const minDeaths = entry.condition.minGames ?? 1;
    if (metrics.peelDeathsTracked < minDeaths) {
      return { matched: false, vars: {} };
    }
    const ratio =
      metrics.peelDeathsTracked > 0
        ? metrics.peelDeathsUnguarded / metrics.peelDeathsTracked
        : 0;
    return {
      matched: compare(ratio, entry.condition),
      vars: {
        peelUnguardedPct: Math.round(ratio * 100),
        peelDeathsTracked: metrics.peelDeathsTracked,
        peelDeathsUnguarded: metrics.peelDeathsUnguarded,
      },
      occurrences: metrics.peelUnguardedGamesCount,
    };
  },
  highDeathRateGames: (metrics, entry) => {
    const perMinuteThreshold = entry.condition.perMinuteThreshold ?? 1;
    const qualifyingGames = metrics.recentDeathRates.filter(
      (rate) => rate >= perMinuteThreshold,
    ).length;
    return {
      matched: compare(qualifyingGames, entry.condition),
      vars: {
        qualifyingGames,
        recentGamesWindow: RECENT_GAMES_WINDOW,
      },
    };
  },
  kdaTrendVsRolling: (metrics, entry) => {
    const ratio =
      metrics.avgKda > 0
        ? (metrics.recentKda - metrics.avgKda) / metrics.avgKda
        : 0;
    return {
      matched: compare(ratio, entry.condition),
      vars: {
        recentKda: metrics.recentKda.toFixed(2),
        rollingKda: metrics.avgKda.toFixed(2),
      },
      occurrences: metrics.recentKdaValues.filter(
        (value) => value > metrics.avgKda,
      ).length,
    };
  },
};

@Injectable()
export class LessonsService {
  private readonly knowledgeBase =
    knowledgeBaseFile.entries as LessonKnowledgeEntry[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
  ) {}

  async generateForAccount(accountId: string) {
    const metrics = await this.computeMetrics(accountId);
    if (!metrics) return [];

    const cards: LessonCard[] = [];
    for (const entry of this.knowledgeBase) {
      if (
        entry.roleScope &&
        !roleMatchesProfile(entry.roleScope, metrics.roleProfile)
      ) {
        continue;
      }

      const evaluator = EVALUATORS[entry.metric];
      if (!evaluator) continue;

      const result = evaluator(metrics, entry);
      if (!result.matched) continue;

      let championFields: Partial<LessonCard> = {};
      if (entry.kind === 'champion') {
        const championKey = String(result.vars.champion);
        const stat = metrics.championStats.find(
          (c) => c.champion === championKey,
        );
        championFields = {
          kind: 'champion',
          championKey,
          championGamesPlayed: stat?.gamesPlayed,
          championWinrate: stat?.winrate,
          championAvgKda: stat?.avgKda,
        };
      }

      cards.push({
        tag: entry.tag,
        title: interpolate(entry.title, result.vars),
        body: interpolate(entry.body, result.vars),
        mediaType: entry.mediaType,
        priority: resolvePriority(entry.tag, result.occurrences ?? 0),
        ...championFields,
      });
    }

    return cards
      .sort((a, b) => b.priority - a.priority)
      .slice(0, MAX_LESSONS)
      .map((card) => {
        const { priority, ...rest } = card;
        void priority;
        return rest;
      });
  }

  private async computeMetrics(accountId: string): Promise<Metrics | null> {
    const summary = await this.stats.getAccountSummary(accountId);
    if (summary.gamesPlayed === 0) return null;

    const [streak, lanes, championStats, visionRows, recentRows, account] =
      await Promise.all([
        this.stats.getStreak(accountId),
        this.stats.getLaneDistribution(accountId),
        this.stats.getByChampion(accountId),
        this.prisma.matchParticipant.findMany({
          where: { accountId },
          include: { match: true },
        }),
        this.prisma.matchParticipant.findMany({
          where: { accountId },
          include: { match: true },
          orderBy: { match: { gameCreation: 'desc' } },
          take: RECENT_GAMES_WINDOW,
        }),
        this.prisma.lolAccount.findUnique({
          where: { id: accountId },
          select: { soloTier: true, flexTier: true },
        }),
      ]);

    // Solo Queue is the reference ladder for individual skill — only fall
    // back to Flex when Solo itself carries no rank, same precedent as
    // behavior-flags.service.ts.
    const soloRanked = account?.soloTier && account.soloTier !== 'Unranked';
    const rankBand = getRankBand(
      soloRanked ? account.soloTier : account?.flexTier,
    );

    const avgVisionScore = average(visionRows.map((row) => row.visionScore));
    const csPerMinValues = visionRows.map(
      (row) => row.csTotal / Math.max(row.match.gameDuration / 60, 1),
    );
    const visionPerMinValues = visionRows.map(
      (row) => row.visionScore / Math.max(row.match.gameDuration / 60, 1),
    );
    const kdaValues = visionRows.map(
      (row) => (row.kills + row.assists) / Math.max(row.deaths, 1),
    );
    const killCsRatioValues = visionRows.map((row, index) =>
      csPerMinValues[index] > 0 ? row.kills / csPerMinValues[index] : 0,
    );
    const avgVisionScorePerMin = average(visionPerMinValues);

    const turretTakedownValues = visionRows
      .map((row) => row.turretTakedowns)
      .filter((value): value is number => value != null);
    const avgTurretTakedowns = average(turretTakedownValues);

    const objectiveParticipationValues: number[] = [];
    for (const row of visionRows) {
      const teamObjectiveTotal =
        (row.teamDragonKills ?? 0) +
        (row.teamBaronKills ?? 0) +
        (row.teamRiftHeraldKills ?? 0);
      if (row.dragonTakedowns != null && teamObjectiveTotal > 0) {
        const ownObjectiveTakedowns =
          (row.dragonTakedowns ?? 0) +
          (row.baronTakedowns ?? 0) +
          (row.riftHeraldTakedowns ?? 0);
        objectiveParticipationValues.push(
          ownObjectiveTakedowns / teamObjectiveTotal,
        );
      }
    }
    const avgObjectiveParticipation = average(objectiveParticipationValues);

    const peelDeathsTracked = visionRows.reduce(
      (sum, row) => sum + (row.peelAdcDeathsTracked ?? 0),
      0,
    );
    const peelDeathsUnguarded = visionRows.reduce(
      (sum, row) => sum + (row.peelAdcDeathsUnguarded ?? 0),
      0,
    );
    const peelUnguardedGamesCount = visionRows.filter(
      (row) => (row.peelAdcDeathsUnguarded ?? 0) > 0,
    ).length;

    const midRoamFramesTracked = visionRows.reduce(
      (sum, row) => sum + (row.midRoamFramesTracked ?? 0),
      0,
    );
    const midRoamFramesAway = visionRows.reduce(
      (sum, row) => sum + (row.midRoamFramesAway ?? 0),
      0,
    );
    const midRoamAwayRatioValues = visionRows
      .filter((row) => row.midRoamFramesTracked)
      .map((row) => (row.midRoamFramesAway ?? 0) / row.midRoamFramesTracked!);

    const teleportGames = visionRows.filter((row) => row.teleportCasts != null);
    const teleportGamesTracked = teleportGames.length;
    const teleportUnusedGames = teleportGames.filter(
      (row) => row.teleportCasts === 0,
    ).length;

    const recentDeathRates = recentRows.map(
      (row) => row.deaths / Math.max(row.match.gameDuration / 60, 1),
    );

    const recentKills = average(recentRows.map((row) => row.kills));
    const recentDeaths = average(recentRows.map((row) => row.deaths));
    const recentAssists = average(recentRows.map((row) => row.assists));
    const recentKda = (recentKills + recentAssists) / Math.max(recentDeaths, 1);
    const recentKdaValues = recentRows.map(
      (row) => (row.kills + row.assists) / Math.max(row.deaths, 1),
    );

    return {
      avgCsPerMin: summary.avgCsPerMin,
      avgKills: summary.avgKills,
      avgDeaths: summary.avgDeaths,
      avgKda: summary.avgKda,
      avgVisionScore,
      avgVisionScorePerMin,
      avgTurretTakedowns,
      turretTakedownsSamples: turretTakedownValues.length,
      avgObjectiveParticipation,
      objectiveParticipationSamples: objectiveParticipationValues.length,
      peelDeathsTracked,
      peelDeathsUnguarded,
      peelUnguardedGamesCount,
      midRoamFramesTracked,
      midRoamFramesAway,
      teleportGamesTracked,
      teleportUnusedGames,
      recentDeathRates,
      csPerMinValues,
      killCsRatioValues,
      visionPerMinValues,
      kdaValues,
      turretTakedownValues,
      objectiveParticipationValues,
      midRoamAwayRatioValues,
      recentKdaValues,
      rankBand,
      roleProfile: deriveRoleProfile(lanes),
      lanes,
      streak,
      recentKda,
      championStats: championStats.map((champion) => ({
        champion: champion.champion,
        gamesPlayed: champion.gamesPlayed,
        winrate: champion.winrate,
        avgKda: champion.avgKda,
      })),
    };
  }
}
