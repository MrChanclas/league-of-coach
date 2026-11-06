import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  STRIKE_POINTS,
  STRIKE_TTL_MS,
} from '../moderation/moderation.constants';
import {
  ModerationService,
  activeStrikeFilter,
  computeStanding,
} from '../moderation/moderation.service';
import type { ResolveReportInput } from './admin.schemas';

// The panel lists at most this many rows per view; enough for this
// community's size, and search narrows users down past it.
const LIST_LIMIT = 200;

const ACCOUNT_SUMMARY = {
  id: true,
  summoner: true,
  tag: true,
  server: true,
  soloTier: true,
  soloDivision: true,
  soloLp: true,
} as const;

const STANDING_FIELDS = { points: true, expiresAt: true } as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
  ) {}

  async overview() {
    const [users, accounts, activeDuos, pendingReports, strikes] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.lolAccount.count(),
        this.prisma.duo.count({ where: { endedAt: null } }),
        this.prisma.duoReport.count({ where: { status: 'pending' } }),
        this.prisma.strike.findMany({
          where: activeStrikeFilter(),
          select: { userId: true, ...STANDING_FIELDS },
        }),
      ]);

    const byUser = new Map<string, typeof strikes>();
    for (const strike of strikes) {
      byUser.set(strike.userId, [...(byUser.get(strike.userId) ?? []), strike]);
    }
    const bannedUsers = [...byUser.values()].filter(
      (userStrikes) => computeStanding(userStrikes).banned,
    ).length;

    return {
      users,
      accounts,
      activeDuos,
      pendingReports,
      usersWithStrikes: byUser.size,
      bannedUsers,
    };
  }

  async listUsers(search?: string) {
    const contains = search
      ? { contains: search, mode: 'insensitive' as const }
      : undefined;
    const users = await this.prisma.user.findMany({
      where: contains
        ? {
            OR: [
              { name: contains },
              { email: contains },
              { accounts: { some: { summoner: contains } } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
      select: {
        id: true,
        name: true,
        email: true,
        discordUsername: true,
        createdAt: true,
        accounts: { select: ACCOUNT_SUMMARY },
        duoProfile: { select: { active: true } },
        strikes: { where: activeStrikeFilter(), select: STANDING_FIELDS },
      },
    });

    return users.map(({ strikes, duoProfile, ...user }) => ({
      ...user,
      lookingForDuo: duoProfile?.active ?? false,
      ...computeStanding(strikes),
    }));
  }

  /** Every strike the user ever got, expired and revoked included. */
  async listUserStrikes(userId: string) {
    const now = Date.now();
    const strikes = await this.prisma.strike.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        severity: true,
        points: true,
        reason: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
        reportId: true,
      },
    });
    return strikes.map((strike) => ({
      ...strike,
      active: !strike.revokedAt && strike.expiresAt.getTime() > now,
    }));
  }

  async listDuos(status: 'active' | 'ended') {
    return this.prisma.duo.findMany({
      where: { endedAt: status === 'active' ? null : { not: null } },
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
      select: {
        id: true,
        queue: true,
        createdAt: true,
        endedAt: true,
        userA: { select: { id: true, name: true } },
        userB: { select: { id: true, name: true } },
        accountA: { select: ACCOUNT_SUMMARY },
        accountB: { select: ACCOUNT_SUMMARY },
        _count: { select: { reports: true, messages: true } },
      },
    });
  }

  async listReports(status: 'pending' | 'resolved') {
    const reports = await this.prisma.duoReport.findMany({
      where:
        status === 'pending'
          ? { status: 'pending' }
          : { status: { in: ['dismissed', 'sanctioned'] } },
      // Oldest first while waiting, so none is left behind; newest first once handled.
      orderBy: { createdAt: status === 'pending' ? 'asc' : 'desc' },
      take: LIST_LIMIT,
      select: {
        id: true,
        reason: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        reporterId: true,
        strikes: { select: { severity: true, points: true, reason: true } },
        duo: {
          select: {
            id: true,
            queue: true,
            createdAt: true,
            userAId: true,
            userA: { select: { id: true, name: true } },
            userB: { select: { id: true, name: true } },
            accountA: { select: ACCOUNT_SUMMARY },
            accountB: { select: ACCOUNT_SUMMARY },
          },
        },
      },
    });

    const reportedIds = reports.map(({ duo, reporterId }) =>
      duo.userAId === reporterId ? duo.userB.id : duo.userA.id,
    );
    const strikes = await this.prisma.strike.findMany({
      where: { userId: { in: reportedIds }, ...activeStrikeFilter() },
      select: { userId: true, ...STANDING_FIELDS },
    });

    return reports.map(({ duo, reporterId, ...report }) => {
      const reporterIsA = duo.userAId === reporterId;
      const reportedId = reporterIsA ? duo.userB.id : duo.userA.id;
      return {
        ...report,
        duo: { id: duo.id, queue: duo.queue, createdAt: duo.createdAt },
        reporter: {
          ...(reporterIsA ? duo.userA : duo.userB),
          account: reporterIsA ? duo.accountA : duo.accountB,
        },
        reported: {
          ...(reporterIsA ? duo.userB : duo.userA),
          account: reporterIsA ? duo.accountB : duo.accountA,
          ...computeStanding(
            strikes.filter((strike) => strike.userId === reportedId),
          ),
        },
      };
    });
  }

  async resolveReport(reportId: string, input: ResolveReportInput) {
    const report = await this.prisma.duoReport.findUnique({
      where: { id: reportId },
      select: {
        status: true,
        reporterId: true,
        duo: { select: { userAId: true, userBId: true } },
      },
    });
    if (!report) throw new NotFoundException('Este reporte no existe.');
    if (report.status !== 'pending') {
      throw new ConflictException('Este reporte ya fue resuelto.');
    }

    const now = new Date();
    if (input.decision === 'dismiss') {
      await this.prisma.duoReport.update({
        where: { id: reportId },
        data: { status: 'dismissed', resolvedAt: now },
      });
      return { status: 'dismissed' as const };
    }

    const reportedId =
      report.duo.userAId === report.reporterId
        ? report.duo.userBId
        : report.duo.userAId;
    await this.prisma.$transaction([
      this.prisma.strike.create({
        data: {
          userId: reportedId,
          reportId,
          severity: input.decision,
          points: STRIKE_POINTS[input.decision],
          reason: input.reason ?? '',
          expiresAt: new Date(now.getTime() + STRIKE_TTL_MS),
        },
      }),
      this.prisma.duoReport.update({
        where: { id: reportId },
        data: { status: 'sanctioned', resolvedAt: now },
      }),
    ]);

    const standing = await this.moderation.getStanding(reportedId);
    if (standing.banned) await this.moderation.enforceSocialBan(reportedId);
    return { status: 'sanctioned' as const, standing };
  }

  async revokeStrike(strikeId: string) {
    const { count } = await this.prisma.strike.updateMany({
      where: { id: strikeId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) {
      throw new NotFoundException('Este strike no existe o ya fue anulado.');
    }
    return { ok: true };
  }
}
