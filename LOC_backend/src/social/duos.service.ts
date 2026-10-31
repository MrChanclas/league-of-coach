import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QUEUE_IDS } from '../common/queue';
import { DiscordService } from '../discord/discord.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  DUO_ACCOUNT_SELECT,
  rankForQueue,
  toAccountCard,
  type DuoAccount,
} from './duo-cards';
import { rankGoalProgress } from './duo-matching';
import type { ReportDuoInput, SetDuoGoalInput } from './social.schemas';

// Games listed in the duo's detail; the summary counts all of them.
export const DUO_RECENT_GAMES = 10;

const DUO_INCLUDE = {
  accountA: { select: DUO_ACCOUNT_SELECT },
  accountB: { select: DUO_ACCOUNT_SELECT },
  userA: { select: { discordUsername: true } },
  userB: { select: { discordUsername: true } },
  goal: true,
} as const;

type KdaRow = { kills: number; deaths: number; assists: number };

function summarize(rows: { win: boolean }[]) {
  const games = rows.length;
  const wins = rows.filter((row) => row.win).length;
  return { games, wins, winrate: games ? wins / games : 0 };
}

function kda(row: KdaRow) {
  return (row.kills + row.assists) / Math.max(row.deaths, 1);
}

@Injectable()
export class DuosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discord: DiscordService,
  ) {}

  /**
   * Loads a duo the user belongs to, with which side they're on. Throws when
   * it doesn't exist or isn't theirs.
   */
  async findForMember(duoId: string, userId: string) {
    const duo = await this.prisma.duo.findUnique({
      where: { id: duoId },
      include: DUO_INCLUDE,
    });
    if (!duo) throw new NotFoundException('Este duo no existe.');
    if (duo.userAId !== userId && duo.userBId !== userId) {
      throw new ForbiddenException('No tienes acceso a este duo.');
    }

    const isA = duo.userAId === userId;
    return {
      duo,
      isA,
      myAccount: isA ? duo.accountA : duo.accountB,
      partnerAccount: isA ? duo.accountB : duo.accountA,
      partnerUserId: isA ? duo.userBId : duo.userAId,
      partnerDiscord: (isA ? duo.userB : duo.userA).discordUsername,
      lastReadAt: isA ? duo.lastReadAtA : duo.lastReadAtB,
    };
  }

  /** Active duos with the partner, last message and unread count. */
  async listMine(userId: string) {
    const duos = await this.prisma.duo.findMany({
      where: { endedAt: null, OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        ...DUO_INCLUDE,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      duos.map(async (duo) => {
        const isA = duo.userAId === userId;
        const lastReadAt = isA ? duo.lastReadAtA : duo.lastReadAtB;
        const unread = await this.prisma.duoMessage.count({
          where: {
            duoId: duo.id,
            senderId: { not: userId },
            ...(lastReadAt && { createdAt: { gt: lastReadAt } }),
          },
        });
        const last = duo.messages[0];
        return {
          id: duo.id,
          queue: duo.queue,
          createdAt: duo.createdAt,
          partner: toAccountCard(isA ? duo.accountB : duo.accountA, duo.queue),
          lastMessage: last
            ? {
                body: last.body,
                createdAt: last.createdAt,
                mine: last.senderId === userId,
              }
            : null,
          unread,
        };
      }),
    );
  }

  async getDetail(userId: string, duoId: string) {
    const member = await this.findForMember(duoId, userId);
    const { duo, myAccount, partnerAccount } = member;
    const target = duo.goal
      ? { tier: duo.goal.targetTier, division: duo.goal.targetDivision }
      : null;

    return {
      id: duo.id,
      queue: duo.queue,
      createdAt: duo.createdAt,
      endedAt: duo.endedAt,
      me: toAccountCard(myAccount, duo.queue),
      partner: {
        ...toAccountCard(partnerAccount, duo.queue),
        discordUsername: member.partnerDiscord,
      },
      goal:
        duo.goal && target
          ? {
              targetTier: duo.goal.targetTier,
              targetDivision: duo.goal.targetDivision,
              deadline: duo.goal.deadline,
              me: rankGoalProgress(rankForQueue(myAccount, duo.queue), target),
              partner: rankGoalProgress(
                rankForQueue(partnerAccount, duo.queue),
                target,
              ),
            }
          : null,
      stats: await this.gamesTogether(
        myAccount,
        partnerAccount,
        duo.queue,
        duo.createdAt,
      ),
    };
  }

  /**
   * Games both accounts played on the same team in the duo's queue, found in
   * the stored history (every match keeps all ten participants). Counted
   * from the start, not only since the duo was formed, so a pair that
   * already played together sees their real record.
   */
  private async gamesTogether(
    mine: DuoAccount,
    partner: DuoAccount,
    queue: string,
    duoCreatedAt: Date,
  ) {
    const rows = await this.prisma.matchParticipant.findMany({
      where: {
        accountId: mine.id,
        match: {
          queueId: queue === 'flex' ? QUEUE_IDS.FLEX : QUEUE_IDS.SOLO,
          participants: { some: { puuid: partner.puuid } },
        },
      },
      select: {
        teamId: true,
        win: true,
        kills: true,
        deaths: true,
        assists: true,
        champion: true,
        match: {
          select: {
            matchId: true,
            gameCreation: true,
            participants: {
              where: { puuid: partner.puuid },
              select: {
                teamId: true,
                champion: true,
                kills: true,
                deaths: true,
                assists: true,
              },
            },
          },
        },
      },
      orderBy: { match: { gameCreation: 'desc' } },
    });

    const together = rows.filter(
      (row) => row.match.participants[0]?.teamId === row.teamId,
    );
    const sinceDuo = together.filter(
      (row) => row.match.gameCreation >= duoCreatedAt,
    );

    return {
      allTime: summarize(together),
      sinceDuo: summarize(sinceDuo),
      recent: together.slice(0, DUO_RECENT_GAMES).map((row) => {
        const partnerRow = row.match.participants[0];
        return {
          matchId: row.match.matchId,
          playedAt: row.match.gameCreation,
          win: row.win,
          me: { champion: row.champion, kda: kda(row) },
          partner: { champion: partnerRow.champion, kda: kda(partnerRow) },
        };
      }),
    };
  }

  async setGoal(userId: string, duoId: string, input: SetDuoGoalInput) {
    const { duo } = await this.findForMember(duoId, userId);
    this.assertActive(duo.endedAt);
    const data = {
      targetTier: input.targetTier,
      targetDivision:
        input.targetTier === 'MASTER' ? null : (input.targetDivision ?? null),
      deadline: input.deadline ?? null,
    };
    return this.prisma.duoGoal.upsert({
      where: { duoId },
      create: { duoId, ...data },
      update: data,
    });
  }

  async removeGoal(userId: string, duoId: string) {
    await this.findForMember(duoId, userId);
    await this.prisma.duoGoal.deleteMany({ where: { duoId } });
  }

  async end(userId: string, duoId: string) {
    const { duo } = await this.findForMember(duoId, userId);
    this.assertActive(duo.endedAt);
    return this.prisma.duo.update({
      where: { id: duoId },
      data: { endedAt: new Date() },
    });
  }

  /** Records the report, ends the duo and tells moderation on Discord. */
  async report(userId: string, duoId: string, input: ReportDuoInput) {
    const { duo, myAccount, partnerAccount } = await this.findForMember(
      duoId,
      userId,
    );
    await this.prisma.$transaction([
      this.prisma.duoReport.create({
        data: { duoId, reporterId: userId, reason: input.reason },
      }),
      this.prisma.duo.update({
        where: { id: duoId },
        data: { endedAt: duo.endedAt ?? new Date() },
      }),
    ]);

    this.discord.notifyFeedback(
      `🚩 **Reporte de duo** \`${duoId}\`: **${myAccount.summoner}#${myAccount.tag}** reporta a **${partnerAccount.summoner}#${partnerAccount.tag}**\n> ${input.reason.replace(/\n/g, '\n> ')}`,
    );
  }

  /** Badge counts for the navigation: pending requests and unread messages. */
  async summary(userId: string) {
    const [pendingRequests, duos] = await Promise.all([
      this.prisma.duoRequest.count({
        where: { toUserId: userId, status: 'pending' },
      }),
      this.prisma.duo.findMany({
        where: {
          endedAt: null,
          OR: [{ userAId: userId }, { userBId: userId }],
        },
        select: {
          id: true,
          userAId: true,
          lastReadAtA: true,
          lastReadAtB: true,
        },
      }),
    ]);

    const unreadPerDuo = await Promise.all(
      duos.map((duo) => {
        const lastReadAt =
          duo.userAId === userId ? duo.lastReadAtA : duo.lastReadAtB;
        return this.prisma.duoMessage.count({
          where: {
            duoId: duo.id,
            senderId: { not: userId },
            ...(lastReadAt && { createdAt: { gt: lastReadAt } }),
          },
        });
      }),
    );

    return {
      pendingRequests,
      unreadMessages: unreadPerDuo.reduce((sum, count) => sum + count, 0),
    };
  }

  assertActive(endedAt: Date | null) {
    if (endedAt) throw new ConflictException('Este duo ya terminó.');
  }
}
