import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { RiotApiService, RiotLeagueEntryDto } from '../riot/riot-api.service';

const AccountSchema = z.object({
  summoner: z.string().min(2).max(80),
  tag: z.string().min(2).max(20),
  server: z.string().min(2).max(30),
  userId: z.string().min(1),
});

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly riotApi: RiotApiService,
  ) {}

  async create(input: z.infer<typeof AccountSchema>) {
    return this.detectAndSave(input);
  }

  async search(input: z.infer<typeof AccountSchema>) {
    const payload = AccountSchema.parse(input);
    const resolved = await this.populateFromRiot(payload);

    const existing = await this.prisma.lolAccount.findFirst({
      where: {
        userId: resolved.userId,
        puuid: resolved.puuid,
      },
    });

    const data = {
      summoner: resolved.summoner,
      tag: resolved.tag,
      server: resolved.server,
      puuid: resolved.puuid,
      profileIconId: resolved.profileIconId,
      soloTier: resolved.soloTier,
      soloDivision: resolved.soloDivision,
      soloLp: resolved.soloLp,
      flexTier: resolved.flexTier,
      flexDivision: resolved.flexDivision,
      flexLp: resolved.flexLp,
      userId: resolved.userId,
    };

    if (existing) {
      const account = await this.prisma.lolAccount.update({
        where: { id: existing.id },
        data,
      });

      return {
        found: true,
        created: false,
        account,
        message: 'Cuenta actualizada con los datos más recientes de Riot.',
      };
    }

    const account = await this.prisma.lolAccount.create({ data });

    return {
      found: true,
      created: true,
      account,
      message: 'Cuenta detectada y vinculada correctamente.',
    };
  }

  private async detectAndSave(input: z.infer<typeof AccountSchema>) {
    return this.search(input);
  }

  async listByUser(userId: string) {
    return this.prisma.lolAccount.findMany({
      where: { userId },
      include: {
        learnings: true,
        goals: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.lolAccount.findUnique({
      where: { id },
      include: {
        learnings: true,
        goals: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.lolAccount.delete({ where: { id } });
  }

  private async populateFromRiot(input: z.infer<typeof AccountSchema>) {
    const riotAccount = await this.riotApi.getAccountByRiotId(
      input.server,
      input.summoner,
      input.tag,
    );

    const entries = await this.riotApi
      .getLeagueEntriesByPuuid(input.server, riotAccount.puuid)
      .catch((): RiotLeagueEntryDto[] => []);

    const summoner = await this.riotApi
      .getSummonerByPuuid(input.server, riotAccount.puuid)
      .catch(() => null);

    const soloEntry = entries.find(
      (entry) => entry.queueType === 'RANKED_SOLO_5x5',
    );
    const flexEntry = entries.find(
      (entry) => entry.queueType === 'RANKED_FLEX_SR',
    );

    return {
      ...input,
      summoner: riotAccount.gameName ?? input.summoner,
      tag: riotAccount.tagLine ?? input.tag,
      puuid: riotAccount.puuid,
      profileIconId: summoner?.profileIconId ?? 0,
      soloTier: soloEntry?.tier ?? 'Unranked',
      soloDivision: soloEntry?.rank ?? 'Unranked',
      soloLp: soloEntry?.leaguePoints ?? 0,
      flexTier: flexEntry?.tier ?? 'Unranked',
      flexDivision: flexEntry?.rank ?? 'Unranked',
      flexLp: flexEntry?.leaguePoints ?? 0,
    };
  }
}
