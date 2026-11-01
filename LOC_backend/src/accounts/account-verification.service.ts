import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { z } from 'zod';
import { DiscordService } from '../discord/discord.service';
import { PrismaService } from '../prisma/prisma.service';
import { RiotApiService } from '../riot/riot-api.service';
import { AccountsService } from './accounts.service';

// Riot gives every player these starter icons, so anyone can equip the one
// asked for without owning anything special.
const STARTER_ICON_COUNT = 29;
const CHALLENGE_TTL_MS = 15 * 60 * 1000;

export const StartVerificationSchema = z.object({
  summoner: z.string().min(2).max(80),
  tag: z.string().min(2).max(20),
  server: z.string().min(2).max(30),
});
export type StartVerificationInput = z.infer<typeof StartVerificationSchema>;

export function pickChallengeIcon(currentIconId: number): number {
  const icon = randomInt(STARTER_ICON_COUNT - 1);
  return icon >= currentIconId ? icon + 1 : icon;
}

/**
 * Proves a Riot account belongs to the signed-in user: only its owner can
 * change its profile icon in the game client. This is the only way to link an
 * account, what unlocks accounts linked before it existed (read-only until
 * then), and what lets the real owner take back one somebody else linked first.
 */
@Injectable()
export class AccountVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly riotApi: RiotApiService,
    private readonly accounts: AccountsService,
    private readonly discord: DiscordService,
  ) {}

  async start(userId: string, input: StartVerificationInput) {
    const riotAccount = await this.riotApi.getAccountByRiotId(
      input.server,
      input.summoner,
      input.tag,
    );
    const existing = await this.prisma.lolAccount.findUnique({
      where: { puuid: riotAccount.puuid },
      select: { userId: true, verifiedAt: true },
    });
    if (existing?.verifiedAt) {
      throw new ConflictException(
        existing.userId === userId
          ? 'Esta cuenta ya está verificada.'
          : 'Esta cuenta ya fue verificada por otro perfil.',
      );
    }

    // Reopening the modal must not swap the icon the user may already have
    // equipped. The deadline stays too, so a challenge can't be held open
    // until the owner happens to pick that icon.
    const pending = await this.prisma.accountVerification.findUnique({
      where: { userId },
    });
    if (
      pending?.puuid === riotAccount.puuid &&
      pending.expiresAt.getTime() > Date.now()
    ) {
      return {
        summoner: pending.summoner,
        tag: pending.tag,
        server: pending.server,
        iconId: pending.iconId,
        expiresAt: pending.expiresAt,
      };
    }

    const riotSummoner = await this.riotApi.getSummonerByPuuid(
      input.server,
      riotAccount.puuid,
    );
    const data = {
      puuid: riotAccount.puuid,
      server: input.server,
      summoner: riotAccount.gameName,
      tag: riotAccount.tagLine,
      iconId: pickChallengeIcon(riotSummoner.profileIconId),
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    };
    const challenge = await this.prisma.accountVerification.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    return {
      summoner: challenge.summoner,
      tag: challenge.tag,
      server: challenge.server,
      iconId: challenge.iconId,
      expiresAt: challenge.expiresAt,
    };
  }

  async confirm(userId: string) {
    const challenge = await this.prisma.accountVerification.findUnique({
      where: { userId },
    });
    if (!challenge || challenge.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        code: 'VERIFICATION_EXPIRED',
        message:
          'La verificación venció. Empieza de nuevo para recibir otro ícono.',
      });
    }

    const riotSummoner = await this.riotApi.getSummonerByPuuid(
      challenge.server,
      challenge.puuid,
    );
    if (riotSummoner.profileIconId !== challenge.iconId) {
      throw new BadRequestException({
        code: 'ICON_NOT_UPDATED',
        message: `Riot todavía muestra el ícono n.º ${riotSummoner.profileIconId} y pedimos el n.º ${challenge.iconId}.`,
      });
    }

    const existing = await this.prisma.lolAccount.findUnique({
      where: { puuid: challenge.puuid },
      select: { id: true, userId: true, verifiedAt: true },
    });
    if (existing?.verifiedAt && existing.userId !== userId) {
      throw new ConflictException(
        'Esta cuenta ya fue verificada por otro perfil.',
      );
    }

    let accountId = existing?.id;
    if (existing && existing.userId !== userId) {
      await this.transferAccount(existing.id, userId);
      this.discord.notifySession(
        `♻️ Cuenta reclamada: **${challenge.summoner}#${challenge.tag}** (${challenge.server})`,
      );
    } else if (!existing) {
      const linked = await this.accounts.create({
        summoner: challenge.summoner,
        tag: challenge.tag,
        server: challenge.server,
        userId,
      });
      accountId = linked.account.id;
    }

    const [account] = await this.prisma.$transaction([
      this.prisma.lolAccount.update({
        where: { id: accountId },
        data: { verifiedAt: new Date() },
      }),
      this.prisma.accountVerification.delete({ where: { userId } }),
    ]);
    return { account, message: 'Cuenta verificada correctamente.' };
  }

  // The match history is about the Riot account, so it stays. Everything the
  // previous holder built on top of it (and any duo they ran on it) goes.
  private async transferAccount(accountId: string, userId: string) {
    await this.prisma.$transaction([
      this.prisma.duo.deleteMany({
        where: { OR: [{ accountAId: accountId }, { accountBId: accountId }] },
      }),
      this.prisma.duoRequest.deleteMany({
        where: {
          OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
        },
      }),
      this.prisma.duoProfile.deleteMany({ where: { accountId } }),
      this.prisma.goal.deleteMany({ where: { accountId } }),
      this.prisma.championPool.deleteMany({ where: { accountId } }),
      this.prisma.championLearning.deleteMany({ where: { accountId } }),
      this.prisma.lolAccount.update({
        where: { id: accountId },
        data: { userId },
      }),
    ]);
  }
}
