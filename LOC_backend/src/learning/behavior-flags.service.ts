import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
import {
  computeChampionPerformance,
  ChampionPerformance,
} from '../common/champion-performance';
import {
  computeRolePerformance,
  formatMetricDelta,
  getRankBand,
  ROLE_KEYS,
  RoleKey,
  RolePerformance,
} from '../common/role-performance';

// A champion/role needs at least this many games before its average is
// trusted enough to flag — matches the sample-size guard already used by
// the "Aprendizaje" lessons (see championWinrateWithMinGames). Below this,
// a bad run reads as a real weakness when it's actually noise.
const MIN_GAMES_FOR_CHAMPION_FLAG = 8;
const MIN_GAMES_FOR_ROLE_FLAG = 10;

// Below this composite score (as a % of the benchmark), a metric is
// considered a real weakness rather than normal match-to-match variance.
const WEAKNESS_SCORE_THRESHOLD = 85;

export type BehaviorFlagSeverity = 'low' | 'medium' | 'high';

export type BehaviorFlag = {
  type: 'CHAMPION_WEAKNESS' | 'ROLE_WEAKNESS';
  role: RoleKey;
  champion: string | null;
  gamesPlayed: number;
  score: number;
  severity: BehaviorFlagSeverity;
  metric: string;
  narrative: string;
};

function severityFor(score: number): BehaviorFlagSeverity {
  if (score < 60) return 'high';
  if (score < WEAKNESS_SCORE_THRESHOLD) return 'medium';
  return 'low';
}

@Injectable()
export class BehaviorFlagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
  ) {}

  async getFlags(
    accountId: string,
    champion?: string,
  ): Promise<BehaviorFlag[]> {
    const account = await this.prisma.lolAccount.findUnique({
      where: { id: accountId },
      select: { soloTier: true, flexTier: true },
    });
    if (!account) {
      throw new NotFoundException('No se encontró la cuenta indicada.');
    }

    const soloRanked = account.soloTier && account.soloTier !== 'Unranked';
    const band = getRankBand(soloRanked ? account.soloTier : account.flexTier);

    const flags: BehaviorFlag[] = [];
    if (!champion) {
      flags.push(...(await this.getRoleWeaknesses(accountId, band)));
    }
    flags.push(...(await this.getChampionWeaknesses(accountId, champion)));

    return flags.sort((a, b) => a.score - b.score);
  }

  private async getRoleWeaknesses(
    accountId: string,
    band: ReturnType<typeof getRankBand>,
  ): Promise<BehaviorFlag[]> {
    const flags: BehaviorFlag[] = [];

    for (const role of ROLE_KEYS) {
      const metrics = await this.stats.getRoleMetrics(accountId, role);
      if (metrics.gamesPlayed < MIN_GAMES_FOR_ROLE_FLAG) continue;

      const perf = computeRolePerformance(
        role,
        band,
        metrics.gamesPlayed,
        metrics,
      );
      const flag = this.toRoleFlag(perf);
      if (flag) flags.push(flag);
    }

    return flags;
  }

  private toRoleFlag(perf: RolePerformance): BehaviorFlag | null {
    if (
      !perf.weakest ||
      perf.score === 0 ||
      perf.score >= WEAKNESS_SCORE_THRESHOLD
    ) {
      return null;
    }

    return {
      type: 'ROLE_WEAKNESS',
      role: perf.role,
      champion: null,
      gamesPlayed: perf.gamesPlayed,
      score: perf.score,
      severity: severityFor(perf.score),
      metric: perf.weakest.key,
      narrative: `En ${perf.role} tu punto más débil es ${formatMetricDelta(perf.weakest)}.`,
    };
  }

  private async getChampionWeaknesses(
    accountId: string,
    champion?: string,
  ): Promise<BehaviorFlag[]> {
    const learnings = await this.prisma.championLearning.findMany({
      where: {
        accountId,
        games: { gte: MIN_GAMES_FOR_CHAMPION_FLAG },
        ...(champion ? { champion } : {}),
      },
    });

    const flags: BehaviorFlag[] = [];
    for (const learning of learnings) {
      const role = learning.role as RoleKey;
      if (!ROLE_KEYS.includes(role)) continue;

      const [roleAverages, championValues] = await Promise.all([
        this.stats.getRoleMetrics(accountId, role),
        this.stats.getChampionRoleMetrics(accountId, role, learning.champion),
      ]);

      const perf = computeChampionPerformance(
        learning.champion,
        role,
        championValues.gamesPlayed,
        championValues,
        roleAverages,
      );
      const flag = this.toChampionFlag(perf);
      if (flag) flags.push(flag);
    }

    return flags;
  }

  private toChampionFlag(
    perf: ChampionPerformance | null,
  ): BehaviorFlag | null {
    if (!perf || !perf.weakest || perf.score >= WEAKNESS_SCORE_THRESHOLD) {
      return null;
    }

    return {
      type: 'CHAMPION_WEAKNESS',
      role: perf.role,
      champion: perf.champion,
      gamesPlayed: perf.gamesPlayed,
      score: perf.score,
      severity: severityFor(perf.score),
      metric: perf.weakest.key,
      narrative: `Con ${perf.champion} tu ${perf.weakest.label.toLowerCase()} está por debajo de tu propio promedio en ${perf.role}: ${formatMetricDelta(perf.weakest)}.`,
    };
  }
}
