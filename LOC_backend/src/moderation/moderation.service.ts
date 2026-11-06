import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SOCIAL_BAN_POINTS } from './moderation.constants';

type ActiveStrike = { points: number; expiresAt: Date };

/**
 * Where a user stands given the strikes in force: how many points, whether
 * that keeps them out of Social and, if so, the moment enough of them expire
 * to let them back in.
 */
export function computeStanding(strikes: ActiveStrike[]) {
  const activePoints = strikes.reduce((sum, strike) => sum + strike.points, 0);
  const banned = activePoints >= SOCIAL_BAN_POINTS;

  let bannedUntil: Date | null = null;
  if (banned) {
    let remaining = activePoints;
    const byExpiry = [...strikes].sort(
      (a, b) => a.expiresAt.getTime() - b.expiresAt.getTime(),
    );
    for (const strike of byExpiry) {
      remaining -= strike.points;
      if (remaining < SOCIAL_BAN_POINTS) {
        bannedUntil = strike.expiresAt;
        break;
      }
    }
  }

  return { activePoints, banned, bannedUntil };
}

export function activeStrikeFilter(now = new Date()) {
  return { revokedAt: null, expiresAt: { gt: now } };
}

const DATE_FORMAT = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  /** What the user sees about their own sanctions. */
  async getStanding(userId: string) {
    const strikes = await this.prisma.strike.findMany({
      where: { userId, ...activeStrikeFilter() },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        severity: true,
        points: true,
        reason: true,
        createdAt: true,
        expiresAt: true,
      },
    });
    return { ...computeStanding(strikes), strikes };
  }

  async assertCanUseSocial(userId: string): Promise<void> {
    const { banned, bannedUntil, activePoints } =
      await this.getStanding(userId);
    if (!banned) return;

    throw new ForbiddenException({
      code: 'SOCIAL_BANNED',
      message: `Tienes ${activePoints} strikes vigentes y no puedes usar Social hasta el ${DATE_FORMAT.format(bannedUntil ?? new Date())}.`,
    });
  }

  /**
   * Takes a user who just reached the ban out of every Social interaction
   * still open: their duo profile stops showing, their duos end and their
   * pending requests are cancelled, so nobody can pair up with them.
   */
  async enforceSocialBan(userId: string) {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.duoProfile.updateMany({
        where: { userId },
        data: { active: false },
      }),
      this.prisma.duo.updateMany({
        where: {
          endedAt: null,
          OR: [{ userAId: userId }, { userBId: userId }],
        },
        data: { endedAt: now },
      }),
      this.prisma.duoRequest.updateMany({
        where: {
          status: 'pending',
          OR: [{ fromUserId: userId }, { toUserId: userId }],
        },
        data: { status: 'cancelled', respondedAt: now },
      }),
    ]);
  }
}
