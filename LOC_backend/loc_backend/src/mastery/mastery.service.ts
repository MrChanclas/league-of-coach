import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChampionDataService } from '../riot/champion-data.service';
import { RiotApiService } from '../riot/riot-api.service';

const CACHE_TTL_MS = 60_000;

type MasteryCacheEntry = {
  expiresAt: number;
  data: Array<{
    championId: number;
    championName: string;
    championLevel: number;
    championPoints: number;
    lastPlayTime: string;
  }>;
};

@Injectable()
export class MasteryService {
  private cache = new Map<string, MasteryCacheEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly riotApi: RiotApiService,
    private readonly championData: ChampionDataService,
  ) {}

  async getForAccount(accountId: string) {
    const cached = this.cache.get(accountId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const account = await this.prisma.lolAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('No se encontró la cuenta indicada.');
    }

    if (!account.puuid) {
      throw new BadRequestException(
        'Esta cuenta no tiene un puuid resuelto; vuelve a buscarla desde Riot para vincularla correctamente.',
      );
    }

    const entries = await this.riotApi.getChampionMasteryByPuuid(
      account.server,
      account.puuid,
    );

    const enriched = await Promise.all(
      entries
        .sort((a, b) => b.championPoints - a.championPoints)
        .map(async (entry) => ({
          championId: entry.championId,
          championName:
            (await this.championData.getChampionName(entry.championId)) ??
            String(entry.championId),
          championLevel: entry.championLevel,
          championPoints: entry.championPoints,
          lastPlayTime: new Date(entry.lastPlayTime).toISOString(),
        })),
    );

    this.cache.set(accountId, {
      data: enriched,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return enriched;
  }
}
