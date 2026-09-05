import { Injectable, NotFoundException } from '@nestjs/common';
import type { Goal, Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
import { rankGoalAnchor, rankScore, rankValue } from '../common/rank-order';
import { computeWinratePace } from './goal-pace';

const TIERS = [
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
const DIVISIONS = ['I', 'II', 'III', 'IV'] as const;
const ROLES = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const;

const BaseGoalFields = {
  accountId: z.string().min(1),
  deadline: z.coerce.date().optional(),
};

export const CreateGoalSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('rango'),
    queueType: z.enum(['solo', 'flex']),
    targetTier: z.enum(TIERS),
    targetDivision: z.enum(DIVISIONS).optional(),
    ...BaseGoalFields,
  }),
  z.object({
    type: z.literal('rol'),
    targetRole: z.enum(ROLES),
    targetWinrate: z.number().min(0).max(1),
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
        targetWinrate: input.targetWinrate,
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
      const targetScore = rankScore(goal.targetTier, goal.targetDivision, 0);
      const currentScore = rankScore(currentTier, currentDivision, currentLp);

      const span = targetScore - anchorScore;
      const rawProgress = span <= 0 ? 100 : clampProgress(((currentScore - anchorScore) / span) * 100);
      const progress = completed ? 100 : Math.min(rawProgress, 99);
      const status = computeStatus(progress, goal.deadline);

      // Floored at 1, not 0, when not completed: a high-LP apex account can
      // numerically match or exceed the target's score before Riot actually
      // reports the promotion (see rankScore) — "0 LP restantes" while still
      // "en curso" would read as a contradiction.
      const gap = completed ? null : Math.max(Math.round(targetScore - currentScore), 1);
      const daysRemaining = daysUntil(goal.deadline);
      const pace =
        gap != null && daysRemaining != null && daysRemaining > 0
          ? { action: `${Math.ceil(gap / daysRemaining)} LP por día`, context: `EN ${daysRemaining} DÍAS` }
          : null;

      return {
        ...goal,
        current: { tier: currentTier, division: currentDivision, lp: currentLp },
        progress,
        status,
        gap,
        gapLabel: gap != null ? 'LP RESTANTES' : null,
        pace: pace?.action ?? null,
        paceSub: pace?.context ?? (gap != null ? 'SIN FECHA LÍMITE' : null),
      };
    }

    if (goal.type === 'rol') {
      const byRole = await this.statsService.getByRole(goal.accountId);
      const stats = byRole.find((entry) => entry.teamPosition === goal.targetRole);
      const gamesPlayed = stats?.gamesPlayed ?? 0;
      const wins = stats?.wins ?? 0;
      const winrate = stats?.winrate ?? 0;
      const targetWinrate = goal.targetWinrate ?? 0;

      const progress = gamesPlayed === 0 ? 0 : clampProgress((winrate / targetWinrate) * 100);
      const completed = gamesPlayed > 0 && winrate >= targetWinrate;

      const gap = completed ? null : Math.max(Math.round((targetWinrate - winrate) * 100), 1);
      const pace = completed ? null : computeWinratePace(wins, gamesPlayed, targetWinrate);

      return {
        ...goal,
        current: { winrate, gamesPlayed },
        progress,
        status: computeStatus(completed ? 100 : progress, goal.deadline),
        gap,
        gapLabel: gap != null ? 'PUNTOS DE WR' : null,
        pace: pace?.action ?? (gap != null ? 'Faltan partidas' : null),
        paceSub: pace?.context ?? null,
      };
    }

    // type === 'campeon'
    const byChampion = await this.statsService.getByChampion(goal.accountId);
    const stats = byChampion.find((entry) => entry.champion === goal.targetChampion);
    const gamesPlayed = stats?.gamesPlayed ?? 0;
    const wins = stats?.wins ?? 0;
    const winrate = stats?.winrate ?? 0;
    const avgKda = stats?.avgKda ?? 0;
    const targetWinrate = goal.targetWinrate ?? 0;

    const winrateProgress = gamesPlayed === 0 ? 0 : clampProgress((winrate / targetWinrate) * 100);
    const kdaProgress =
      goal.targetKda != null ? (gamesPlayed === 0 ? 0 : clampProgress((avgKda / goal.targetKda) * 100)) : null;

    const progress = kdaProgress != null ? Math.round((winrateProgress + kdaProgress) / 2) : winrateProgress;
    const completed =
      gamesPlayed > 0 && winrate >= targetWinrate && (goal.targetKda == null || avgKda >= goal.targetKda);

    // The gap/pace narrative is driven by winrate (the primary metric in the
    // example rows); KDA stays visible via `current` but doesn't get its own
    // gap — mirroring the design doc, which never gaps two metrics at once.
    const gap = completed ? null : Math.max(Math.round((targetWinrate - winrate) * 100), 1);
    const pace = completed ? null : computeWinratePace(wins, gamesPlayed, targetWinrate);

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
}
