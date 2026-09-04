import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiotLeagueEntryDto } from '../riot/riot-api.service';

type QueueKey = 'solo' | 'flex';

const QUEUE_TYPE_BY_RIOT_QUEUE: Record<string, QueueKey> = {
  RANKED_SOLO_5x5: 'solo',
  RANKED_FLEX_SR: 'flex',
};

@Injectable()
export class RankSnapshotsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordFromLeagueEntries(
    accountId: string,
    entries: RiotLeagueEntryDto[],
  ) {
    const rows = entries
      .map((entry) => {
        const queueType = QUEUE_TYPE_BY_RIOT_QUEUE[entry.queueType];
        if (!queueType) return null;
        return {
          accountId,
          queueType,
          tier: entry.tier,
          division: entry.rank,
          lp: entry.leaguePoints,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length === 0) return;

    await this.prisma.rankSnapshot.createMany({ data: rows });
  }

  async getHistory(accountId: string, queueType: QueueKey, days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.rankSnapshot.findMany({
      where: { accountId, queueType, capturedAt: { gte: since } },
      orderBy: { capturedAt: 'asc' },
    });
  }
}
