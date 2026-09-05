import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PuuidRefreshService } from '../riot/puuid-refresh.service';
import { isStalePuuidError, RiotApiService, RiotLeagueEntryDto } from '../riot/riot-api.service';

export type QueueKey = 'solo' | 'flex';

const QUEUE_TYPE_BY_RIOT_QUEUE: Record<string, QueueKey> = {
  RANKED_SOLO_5x5: 'solo',
  RANKED_FLEX_SR: 'flex',
};

@Injectable()
export class RankSnapshotsService {
  private readonly logger = new Logger(RankSnapshotsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly riotApi: RiotApiService,
    private readonly puuidRefresh: PuuidRefreshService,
  ) {}

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

  /** Full, unfiltered snapshot history for an account/queue, oldest first. */
  async getAllHistory(accountId: string, queueType: QueueKey) {
    return this.prisma.rankSnapshot.findMany({
      where: { accountId, queueType },
      orderBy: { capturedAt: 'asc' },
    });
  }

  /**
   * Re-fetches an account's current league entries from Riot, updates the
   * cached tier/division/LP on LolAccount, and records a snapshot row.
   * Shared by manual match sync and the periodic background poller.
   */
  async refreshAccountRank(account: {
    id: string;
    server: string;
    summoner: string;
    tag: string;
    puuid: string;
  }) {
    let entries: RiotLeagueEntryDto[];
    try {
      entries = await this.riotApi.getLeagueEntriesByPuuid(account.server, account.puuid);
    } catch (error) {
      if (!isStalePuuidError(error)) {
        this.logger.warn(`No se pudo obtener el rango de la cuenta ${account.id}: ${error}`);
        return;
      }
      const freshPuuid = await this.puuidRefresh.refresh(account);
      entries = await this.riotApi
        .getLeagueEntriesByPuuid(account.server, freshPuuid)
        .catch((): RiotLeagueEntryDto[] => []);
    }

    if (entries.length === 0) return;

    const soloEntry = entries.find((entry) => entry.queueType === 'RANKED_SOLO_5x5');
    const flexEntry = entries.find((entry) => entry.queueType === 'RANKED_FLEX_SR');

    await this.prisma.lolAccount.update({
      where: { id: account.id },
      data: {
        ...(soloEntry && {
          soloTier: soloEntry.tier,
          soloDivision: soloEntry.rank,
          soloLp: soloEntry.leaguePoints,
        }),
        ...(flexEntry && {
          flexTier: flexEntry.tier,
          flexDivision: flexEntry.rank,
          flexLp: flexEntry.leaguePoints,
        }),
      },
    });

    await this.recordFromLeagueEntries(account.id, entries);
  }

  /**
   * Refreshes every linked account's rank, one at a time. Riot API pacing is
   * already handled globally by RiotApiService's throttle, so this is safe
   * to call for an arbitrary number of accounts.
   */
  async pollAllAccounts() {
    const accounts = await this.prisma.lolAccount.findMany({
      select: { id: true, server: true, summoner: true, tag: true, puuid: true },
    });

    let refreshed = 0;
    for (const account of accounts) {
      try {
        await this.refreshAccountRank(account);
        refreshed += 1;
      } catch (error) {
        this.logger.warn(
          `No se pudo refrescar el rango de la cuenta ${account.id}: ${error}`,
        );
      }
    }

    this.logger.log(`Polling de rango completado: ${refreshed}/${accounts.length} cuentas.`);
    return { total: accounts.length, refreshed };
  }
}
