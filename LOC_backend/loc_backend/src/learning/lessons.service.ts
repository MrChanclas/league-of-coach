import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
import knowledgeBaseFile from './data/lessons-knowledge-base.json';

const MAX_LESSONS = 6;
const RECENT_GAMES_WINDOW = 5;

type LessonCondition = {
  operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq';
  value?: number;
  minGames?: number;
  streakType?: 'win' | 'loss';
  minCount?: number;
};

type LessonKnowledgeEntry = {
  id: string;
  tag: string;
  metric: string;
  roleScope?: string[];
  condition: LessonCondition;
  title: string;
  body: string;
  mediaType: string;
  metaTemplate: string;
  priority: number;
};

type Metrics = {
  avgCsPerMin: number;
  avgKills: number;
  avgDeaths: number;
  avgKda: number;
  avgVisionScore: number;
  avgVisionScorePerMin: number;
  primaryRole: string;
  streak: { type: 'win' | 'loss' | 'none'; count: number };
  recentKda: number;
  championStats: Array<{
    champion: string;
    gamesPlayed: number;
    winrate: number;
  }>;
};

type EvaluatorResult = { matched: boolean; vars: Record<string, string | number> };
type Evaluator = (metrics: Metrics, entry: LessonKnowledgeEntry) => EvaluatorResult;

type LessonCard = {
  tag: string;
  title: string;
  body: string;
  mediaType: string;
  meta: string;
  priority: number;
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

function interpolate(template: string, vars: Record<string, string | number>) {
  return template.replace(/{{(\w+)}}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : '',
  );
}

const EVALUATORS: Record<string, Evaluator> = {
  avgCsPerMin: (metrics, entry) => ({
    matched: compare(metrics.avgCsPerMin, entry.condition),
    vars: {
      avgCsPerMin: metrics.avgCsPerMin.toFixed(1),
      benchmark: entry.condition.value ?? 0,
    },
  }),
  killParticipationVsCsRatio: (metrics, entry) => {
    const ratio =
      metrics.avgCsPerMin > 0 ? metrics.avgKills / metrics.avgCsPerMin : 0;
    return {
      matched: compare(ratio, entry.condition),
      vars: {
        avgKills: metrics.avgKills.toFixed(1),
        avgCsPerMin: metrics.avgCsPerMin.toFixed(1),
      },
    };
  },
  avgVisionScorePerMin: (metrics, entry) => ({
    matched: compare(metrics.avgVisionScorePerMin, entry.condition),
    vars: {
      avgVisionScore: metrics.avgVisionScore.toFixed(1),
      avgVisionScorePerMin: metrics.avgVisionScorePerMin.toFixed(2),
    },
  }),
  avgKda: (metrics, entry) => ({
    matched: compare(metrics.avgKda, entry.condition),
    vars: { avgKda: metrics.avgKda.toFixed(2) },
  }),
  championWinrateWithMinGames: (metrics, entry) => {
    const hit = metrics.championStats.find(
      (champion) =>
        champion.gamesPlayed >= (entry.condition.minGames ?? 0) &&
        compare(champion.winrate, entry.condition),
    );
    if (!hit) {
      return {
        matched: false,
        vars: {} as Record<string, string | number>,
      };
    }
    return {
      matched: true,
      vars: {
        champion: hit.champion,
        championWinrate: Math.round(hit.winrate * 100),
        championGames: hit.gamesPlayed,
      },
    };
  },
  currentStreak: (metrics, entry) => {
    const matched =
      metrics.streak.type === entry.condition.streakType &&
      metrics.streak.count >= (entry.condition.minCount ?? 0);
    return { matched, vars: { streakCount: metrics.streak.count } };
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
      if (entry.roleScope && !entry.roleScope.includes(metrics.primaryRole)) {
        continue;
      }

      const evaluator = EVALUATORS[entry.metric];
      if (!evaluator) continue;

      const result = evaluator(metrics, entry);
      if (!result.matched) continue;

      cards.push({
        tag: entry.tag,
        title: entry.title,
        body: interpolate(entry.body, result.vars),
        mediaType: entry.mediaType,
        meta: interpolate(entry.metaTemplate, result.vars),
        priority: entry.priority,
      });
    }

    return cards
      .sort((a, b) => b.priority - a.priority)
      .slice(0, MAX_LESSONS)
      .map(({ priority: _priority, ...card }) => card);
  }

  private async computeMetrics(accountId: string): Promise<Metrics | null> {
    const summary = await this.stats.getAccountSummary(accountId);
    if (summary.gamesPlayed === 0) return null;

    const [streak, lanes, championStats, visionRows, recentRows] =
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
      ]);

    const avgVisionScore = average(visionRows.map((row) => row.visionScore));
    const avgVisionScorePerMin = average(
      visionRows.map(
        (row) => row.visionScore / Math.max(row.match.gameDuration / 60, 1),
      ),
    );

    const recentKills = average(recentRows.map((row) => row.kills));
    const recentDeaths = average(recentRows.map((row) => row.deaths));
    const recentAssists = average(recentRows.map((row) => row.assists));
    const recentKda =
      (recentKills + recentAssists) / Math.max(recentDeaths, 1);

    return {
      avgCsPerMin: summary.avgCsPerMin,
      avgKills: summary.avgKills,
      avgDeaths: summary.avgDeaths,
      avgKda: summary.avgKda,
      avgVisionScore,
      avgVisionScorePerMin,
      primaryRole: lanes[0]?.lane ?? 'UNKNOWN',
      streak,
      recentKda,
      championStats: championStats.map((champion) => ({
        champion: champion.champion,
        gamesPlayed: champion.gamesPlayed,
        winrate: champion.winrate,
      })),
    };
  }
}
