import { Injectable, NotFoundException } from '@nestjs/common';
import type { Goal, Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { LeagueCutoffService } from '../riot/league-cutoff.service';
import { StatsService } from '../stats/stats.service';
import {
  DIVISION_ORDER,
  rankGoalAnchor,
  rankScore,
  rankValue,
  TIER_ORDER,
} from '../common/rank-order';
import {
  computeRolePerformance,
  formatMetricDelta,
  getRankBand,
  ROLE_KEYS,
  type RoleKey,
} from '../common/role-performance';
import { RIOT_QUEUE_TYPE_BY_KEY } from '../common/queue';
import { computeWinratePace } from './goal-pace';

const BaseGoalFields = {
  accountId: z.string().min(1),
  deadline: z.coerce.date().optional(),
};

export const CreateGoalSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('rango'),
    queueType: z.enum(['solo', 'flex']),
    targetTier: z.enum(TIER_ORDER),
    targetDivision: z.enum(DIVISION_ORDER).optional(),
    ...BaseGoalFields,
  }),
  z.object({
    type: z.literal('rol'),
    targetRole: z.enum(ROLE_KEYS),
    ...BaseGoalFields,
  }),
  z.object({
    type: z.literal('campeon'),
    targetChampion: z.string().min(1),
    targetWinrate: z.number().min(0).max(1),
    targetKda: z.number().min(0).optional(),
    ...BaseGoalFields,
  }),
]);

export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;

function computeStatus(progress: number, deadline: Date | null) {
  if (progress >= 100) return 'completed' as const;
  if (deadline && deadline.getTime() < Date.now()) return 'behind' as const;
  return 'in_progress' as const;
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function daysUntil(deadline: Date | null): number | null {
  if (!deadline) return null;
  return Math.ceil((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

type AccountForGoal = {
  server: string;
  soloTier: string;
  soloDivision: string;
  soloLp: number;
  flexTier: string;
  flexDivision: string;
  flexLp: number;
};

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statsService: StatsService,
    private readonly leagueCutoff: LeagueCutoffService,
  ) {}

  async create(input: CreateGoalInput) {
    const account = await this.prisma.lolAccount.findUniqueOrThrow({
      where: { id: input.accountId },
    });

    const data: Prisma.GoalUncheckedCreateInput = {
      type: input.type,
      accountId: input.accountId,
      deadline: input.deadline ?? null,
    };

    if (input.type === 'rango') {
      Object.assign(data, {
        queueType: input.queueType,
        targetTier: input.targetTier,
        targetDivision: input.targetDivision ?? null,
      });
    } else if (input.type === 'rol') {
      Object.assign(data, {
        targetRole: input.targetRole,
      });
    } else {
      Object.assign(data, {
        targetChampion: input.targetChampion,
        targetWinrate: input.targetWinrate,
        targetKda: input.targetKda ?? null,
      });
    }

    const goal = await this.prisma.goal.create({ data });
    return this.attachProgress(goal, account);
  }

  async listByAccount(accountId: string) {
    const [goals, account] = await Promise.all([
      this.prisma.goal.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lolAccount.findUniqueOrThrow({ where: { id: accountId } }),
    ]);

    return Promise.all(goals.map((goal) => this.attachProgress(goal, account)));
  }

  async findOneOrThrow(id: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal) {
      throw new NotFoundException('No se encontró el objetivo indicado.');
    }
    return goal;
  }

  async remove(id: string) {
    return this.prisma.goal.delete({ where: { id } });
  }

  private async attachProgress(goal: Goal, account: AccountForGoal) {
    if (goal.type === 'rango') {
      const [currentTier, currentDivision, currentLp] =
        goal.queueType === 'solo'
          ? [account.soloTier, account.soloDivision, account.soloLp]
          : [account.flexTier, account.flexDivision, account.flexLp];

      const currentValue = rankValue(currentTier, currentDivision);
      const targetValue = rankValue(goal.targetTier, goal.targetDivision);
      const completed = currentValue >= 0 && currentValue >= targetValue;

      // The 0%-100% window spans exactly one full tier of climbing, ending
      // at the target (see rankGoalAnchor) — so a goal shows a meaningful
      // percentage immediately (e.g. one division short of the target is
      // already ~75%+), not "0% until you progress since creating it".
      // LP fills in the points within the current tier/division for a
      // smooth bar; completion still strictly requires Riot reporting the
      // target tier, never a numeric score comparison.
      const anchor = rankGoalAnchor(goal.targetTier ?? '');
      const anchorScore = rankScore(anchor.tier, anchor.division, 0);
      // Grandmaster/Challenger have no fixed LP threshold (Riot cuts the
      // leaderboard at a dynamic rank), so their target LP comes from the
      // real, current leaderboard cutoff instead of a flat 0 — see
      // resolveApexTargetLp.
      const apexTargetLp = await this.resolveApexTargetLp(
        account.server,
        goal.queueType,
        goal.targetTier,
      );
      const targetScore = rankScore(
        goal.targetTier,
        goal.targetDivision,
        apexTargetLp ?? 0,
      );
      const currentScore = rankScore(currentTier, currentDivision, currentLp);

      const span = targetScore - anchorScore;
      const rawProgress =
        span <= 0
          ? 100
          : clampProgress(((currentScore - anchorScore) / span) * 100);
      const progress = completed ? 100 : Math.min(rawProgress, 99);
      const status = computeStatus(progress, goal.deadline);

      // Floored at 1, not 0, when not completed: the leaderboard cutoff can
      // lag a few minutes behind an account's very latest game, so LP can
      // transiently match or exceed it before Riot actually reports the
      // promotion — "0 LP restantes" while still "en curso" would read as a
      // contradiction.
      const gap = completed
        ? null
        : Math.max(Math.round(targetScore - currentScore), 1);
      const daysRemaining = daysUntil(goal.deadline);
      const pace =
        gap != null && daysRemaining != null && daysRemaining > 0
          ? {
              action: `${Math.ceil(gap / daysRemaining)} LP por día`,
              context: `EN ${daysRemaining} DÍAS`,
            }
          : null;

      return {
        ...goal,
        current: {
          tier: currentTier,
          division: currentDivision,
          lp: currentLp,
        },
        progress,
        status,
        gap,
        gapLabel: gap != null ? 'LP RESTANTES' : null,
        pace: pace?.action ?? null,
        paceSub: pace?.context ?? (gap != null ? 'SIN FECHA LÍMITE' : null),
      };
    }

    if (goal.type === 'rol') {
      const role = goal.targetRole as RoleKey;
      const metrics = await this.statsService.getRoleMetrics(
        goal.accountId,
        role,
      );
      const soloRanked = account.soloTier && account.soloTier !== 'Unranked';
      const band = getRankBand(
        soloRanked ? account.soloTier : account.flexTier,
      );
      const perf = computeRolePerformance(
        role,
        band,
        metrics.gamesPlayed,
        metrics,
      );

      const gamesPlayed = perf.gamesPlayed;
      const completed = gamesPlayed > 0 && perf.score >= 100;
      const progress = gamesPlayed === 0 ? 0 : clampProgress(perf.score);

      const gap =
        completed || gamesPlayed === 0
          ? null
          : Math.max(Math.round(100 - perf.score), 1);
      const hasPace = !completed && gamesPlayed >= 5 && perf.weakest != null;

      return {
        ...goal,
        current: {
          roleScore: perf.score,
          rankBand: perf.band,
          gamesPlayed,
          roleMetrics: perf.metrics,
        },
        progress,
        status: computeStatus(completed ? 100 : progress, goal.deadline),
        gap,
        gapLabel: gap != null ? 'PUNTOS PARA EL BENCHMARK' : null,
        pace: hasPace
          ? formatMetricDelta(perf.weakest!)
          : gap != null
            ? 'Faltan partidas'
            : null,
        paceSub: hasPace ? 'MÉTRICA A MEJORAR' : null,
      };
    }

    // type === 'campeon'
    const byChampion = await this.statsService.getByChampion(goal.accountId);
    const stats = byChampion.find(
      (entry) => entry.champion === goal.targetChampion,
    );
    const gamesPlayed = stats?.gamesPlayed ?? 0;
    const wins = stats?.wins ?? 0;
    const winrate = stats?.winrate ?? 0;
    const avgKda = stats?.avgKda ?? 0;
    const targetWinrate = goal.targetWinrate ?? 0;

    const winrateProgress =
      gamesPlayed === 0 ? 0 : clampProgress((winrate / targetWinrate) * 100);
    const kdaProgress =
      goal.targetKda != null
        ? gamesPlayed === 0
          ? 0
          : clampProgress((avgKda / goal.targetKda) * 100)
        : null;

    const progress =
      kdaProgress != null
        ? Math.round((winrateProgress + kdaProgress) / 2)
        : winrateProgress;
    const completed =
      gamesPlayed > 0 &&
      winrate >= targetWinrate &&
      (goal.targetKda == null || avgKda >= goal.targetKda);

    // The gap/pace narrative is driven by winrate (the primary metric in the
    // example rows); KDA stays visible via `current` but doesn't get its own
    // gap — mirroring the design doc, which never gaps two metrics at once.
    const gap = completed
      ? null
      : Math.max(Math.round((targetWinrate - winrate) * 100), 1);
    const pace = completed
      ? null
      : computeWinratePace(wins, gamesPlayed, targetWinrate);

    return {
      ...goal,
      current: { winrate, avgKda, gamesPlayed },
      progress,
      status: computeStatus(completed ? 100 : progress, goal.deadline),
      gap,
      gapLabel: gap != null ? 'PUNTOS DE WR' : null,
      pace: pace?.action ?? (gap != null ? 'Faltan partidas' : null),
      paceSub: pace?.context ?? null,
    };
  }

  /**
   * Live LP cutoff for a Grandmaster/Challenger target, or null for any
   * other target tier (including Master, which still promotes on a fixed
   * LP threshold from Diamond I, unlike GM/Challenger).
   */
  private async resolveApexTargetLp(
    server: string,
    queueType: string | null,
    targetTier: string | null,
  ): Promise<number | null> {
    if (targetTier !== 'GRANDMASTER' && targetTier !== 'CHALLENGER')
      return null;

    const riotQueue =
      queueType === 'flex'
        ? RIOT_QUEUE_TYPE_BY_KEY.flex
        : RIOT_QUEUE_TYPE_BY_KEY.solo;
    return this.leagueCutoff.getCutoffLp(server, riotQueue, targetTier);
  }
}
