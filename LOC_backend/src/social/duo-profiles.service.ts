import { BadRequestException, Injectable } from '@nestjs/common';
import { canDuo, type DuoQueue } from '../common/duo-eligibility';
import { rankValue } from '../common/rank-order';
import { PrismaService } from '../prisma/prisma.service';
import {
  DUO_ACCOUNT_SELECT,
  rankForQueue,
  toAccountCard,
  type DuoAccount,
} from './duo-cards';
import { scoreDuoMatch, type DuoCard } from './duo-matching';
import type { UpsertDuoProfileInput } from './social.schemas';

// Enough to choose from without turning the list into a feed.
export const MAX_CANDIDATES = 30;

type ProfileWithAccount = {
  userId: string;
  queue: string;
  roles: string[];
  lookingFor: string[];
  availability: string[];
  note: string | null;
  account: DuoAccount;
};

@Injectable()
export class DuoProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(userId: string) {
    const [profile, user] = await Promise.all([
      this.prisma.duoProfile.findUnique({ where: { userId } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { discordUsername: true },
      }),
    ]);
    return { profile, discordUsername: user?.discordUsername ?? null };
  }

  async upsert(userId: string, input: UpsertDuoProfileInput) {
    if (input.active) {
      const account = await this.prisma.lolAccount.findUnique({
        where: { id: input.accountId },
        select: { verifiedAt: true },
      });
      if (!account?.verifiedAt) {
        throw new BadRequestException(
          'Verifica que esta cuenta de Riot es tuya antes de buscar duo.',
        );
      }
    }

    const data = { ...input, note: input.note || null };
    return this.prisma.duoProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
      include: { account: { select: DUO_ACCOUNT_SELECT } },
    });
  }

  /**
   * Active profiles that can actually queue with mine: same queue and
   * server, a rank pair Riot allows, not already my duo. Best fit first.
   */
  async listCandidates(userId: string) {
    const mine = await this.prisma.duoProfile.findUnique({
      where: { userId },
      include: { account: { select: DUO_ACCOUNT_SELECT } },
    });
    if (!mine || !mine.active || !mine.account.verifiedAt) {
      return { profileActive: false, candidates: [] };
    }

    const [others, activeDuos, pendingRequests] = await Promise.all([
      this.prisma.duoProfile.findMany({
        where: {
          active: true,
          queue: mine.queue,
          userId: { not: userId },
          account: { server: mine.account.server, verifiedAt: { not: null } },
        },
        include: { account: { select: DUO_ACCOUNT_SELECT } },
      }),
      this.prisma.duo.findMany({
        where: {
          endedAt: null,
          OR: [{ userAId: userId }, { userBId: userId }],
        },
        select: { userAId: true, userBId: true },
      }),
      this.prisma.duoRequest.findMany({
        where: {
          status: 'pending',
          OR: [{ fromUserId: userId }, { toUserId: userId }],
        },
        select: { fromUserId: true, toUserId: true },
      }),
    ]);

    const partners = new Set(
      activeDuos.map((duo) =>
        duo.userAId === userId ? duo.userBId : duo.userAId,
      ),
    );
    const queue = mine.queue as DuoQueue;
    const myRank = rankForQueue(mine.account, queue);
    const eligible = others.filter(
      (other) =>
        !partners.has(other.userId) &&
        canDuo(queue, myRank, rankForQueue(other.account, queue)),
    );

    const goals = await this.openRankGoals(
      [mine.account, ...eligible.map((other) => other.account)],
      queue,
    );
    const myCard = this.toCard(mine, goals);

    const candidates = eligible
      .map((other) => {
        const match = scoreDuoMatch(myCard, this.toCard(other, goals));
        const pending = pendingRequests.find(
          (request) =>
            request.fromUserId === other.userId ||
            request.toUserId === other.userId,
        );
        return {
          userId: other.userId,
          account: toAccountCard(other.account, queue),
          queue: other.queue,
          roles: other.roles,
          lookingFor: other.lookingFor,
          availability: other.availability,
          note: other.note,
          match,
          pendingRequest: pending
            ? pending.fromUserId === userId
              ? ('sent' as const)
              : ('received' as const)
            : null,
        };
      })
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, MAX_CANDIDATES);

    return { profileActive: true, candidates };
  }

  private toCard(
    profile: ProfileWithAccount,
    goals: Map<string, { tier: string; division: string | null }>,
  ): DuoCard {
    return {
      roles: profile.roles,
      lookingFor: profile.lookingFor,
      availability: profile.availability,
      rank: rankForQueue(profile.account, profile.queue),
      rankGoal: goals.get(profile.account.id) ?? null,
    };
  }

  /**
   * Each account's closest open rank goal in this queue (one it hasn't
   * reached yet), keyed by account id — what "same goal" compares.
   */
  private async openRankGoals(accounts: DuoAccount[], queue: DuoQueue) {
    const goals = await this.prisma.goal.findMany({
      where: {
        type: 'rango',
        queueType: queue,
        accountId: { in: accounts.map((account) => account.id) },
      },
      select: { accountId: true, targetTier: true, targetDivision: true },
    });

    const byAccount = new Map<
      string,
      { tier: string; division: string | null }
    >();
    for (const account of accounts) {
      const rank = rankForQueue(account, queue);
      const current = rankValue(rank.tier, rank.division);
      const open = goals
        .filter((goal) => goal.accountId === account.id && goal.targetTier)
        .filter(
          (goal) => rankValue(goal.targetTier, goal.targetDivision) > current,
        )
        .sort(
          (a, b) =>
            rankValue(a.targetTier, a.targetDivision) -
            rankValue(b.targetTier, b.targetDivision),
        )[0];
      if (open?.targetTier) {
        byAccount.set(account.id, {
          tier: open.targetTier,
          division: open.targetDivision,
        });
      }
    }
    return byAccount;
  }
}
