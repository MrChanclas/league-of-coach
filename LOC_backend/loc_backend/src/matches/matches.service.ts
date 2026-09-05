import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DiscordService } from '../discord/discord.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueueKey, RankSnapshotsService } from '../rank-snapshots/rank-snapshots.service';
import { PuuidRefreshService } from '../riot/puuid-refresh.service';
import { isStalePuuidError, RiotApiService, RiotMatchDto } from '../riot/riot-api.service';

const RANKED_QUEUE_TO_KEY: Record<number, QueueKey> = { 420: 'solo', 440: 'flex' };

// Riot's match-ids endpoint accepts up to 20 per page.
const PAGE_SIZE = 20;
// How many pages of history we're willing to page back through in one sync
// call, as a safety cap against runaway loops for accounts with very sparse
// (or no) ranked history.
const MAX_BACKFILL_PAGES = 5;
// Standard history depth every account converges to, matching the "20
// partidas por análisis" the app promises regardless of how often an
// account plays.
const DEFAULT_TARGET_MATCH_COUNT = 20;

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly riotApi: RiotApiService,
    private readonly rankSnapshots: RankSnapshotsService,
    private readonly discord: DiscordService,
    private readonly puuidRefresh: PuuidRefreshService,
  ) {}

  async syncAccount(accountId: string, targetCount = DEFAULT_TARGET_MATCH_COUNT) {
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

    const storedCount = await this.prisma.matchParticipant.count({
      where: { accountId: account.id },
    });

    let puuid = account.puuid;
    let synced = 0;
    let skipped = 0;
    let totalFetched = 0;
    let start = 0;

    // Page 0 always runs first (even if we already have plenty stored) so
    // newly played games get picked up; later pages only run if we're still
    // short of the target depth, backfilling further into history.
    for (let page = 0; page < MAX_BACKFILL_PAGES; page += 1) {
      let matchIds: string[];
      try {
        matchIds = await this.riotApi.getMatchIdsByPuuid(account.server, puuid, {
          start,
          count: PAGE_SIZE,
        });
      } catch (error) {
        // The stored puuid can go stale if the Riot API key was rotated
        // since this account was last resolved; only worth retrying once,
        // right at the start of the sync.
        if (page > 0 || !isStalePuuidError(error)) throw error;
        puuid = await this.puuidRefresh.refresh(account);
        matchIds = await this.riotApi.getMatchIdsByPuuid(account.server, puuid, {
          start,
          count: PAGE_SIZE,
        });
      }

      if (matchIds.length === 0) break;
      totalFetched += matchIds.length;

      const existing = await this.prisma.match.findMany({
        where: { matchId: { in: matchIds } },
        select: { matchId: true },
      });
      const existingIds = new Set(existing.map((match) => match.matchId));
      const newIds = matchIds.filter((id) => !existingIds.has(id));
      skipped += matchIds.length - newIds.length;

      for (const matchId of newIds) {
        const matchDto = await this.riotApi.getMatchById(account.server, matchId);
        await this.storeMatch(account.id, account.server, puuid, matchDto);
        synced += 1;
      }

      const hasReachedTarget = storedCount + synced >= targetCount;
      const hasReachedEndOfHistory = matchIds.length < PAGE_SIZE;
      if (hasReachedTarget || hasReachedEndOfHistory) break;

      start += PAGE_SIZE;
    }

    await this.rankSnapshots.refreshAccountRank({ ...account, puuid });

    if (synced > 0) {
      this.discord.notifySession(
        `🔄 Sync de **${account.summoner}#${account.tag}**: ${synced} partida(s) nueva(s).`,
      );
    }

    return { synced, skipped, totalFetched };
  }

  private async storeMatch(
    accountId: string,
    server: string,
    puuid: string,
    matchDto: RiotMatchDto,
  ) {
    const participants = matchDto.info.participants;
    const trackedParticipant = participants.find(
      (entry) => entry.puuid === puuid,
    );

    if (!trackedParticipant) {
      return;
    }

    const match = await this.prisma.match.create({
      data: {
        matchId: matchDto.metadata.matchId,
        server,
        gameCreation: new Date(matchDto.info.gameCreation),
        gameDuration: matchDto.info.gameDuration,
        gameMode: matchDto.info.gameMode,
        gameVersion: matchDto.info.gameVersion,
        queueId: matchDto.info.queueId,
      },
    });

    const knownAccounts = await this.prisma.lolAccount.findMany({
      where: { puuid: { in: participants.map((entry) => entry.puuid) } },
      select: { id: true, puuid: true },
    });
    const accountIdByPuuid = new Map(
      knownAccounts.map((account) => [account.puuid, account.id]),
    );
    accountIdByPuuid.set(puuid, accountId);

    await this.prisma.matchParticipant.createMany({
      data: participants.map((participant) => ({
        matchId: match.id,
        accountId: accountIdByPuuid.get(participant.puuid) ?? null,
        puuid: participant.puuid,
        champion: participant.championName,
        championId: participant.championId,
        teamPosition: participant.teamPosition,
        win: participant.win,
        kills: participant.kills,
        deaths: participant.deaths,
        assists: participant.assists,
        csTotal:
          participant.totalMinionsKilled + participant.neutralMinionsKilled,
        goldEarned: participant.goldEarned,
        visionScore: participant.visionScore,
        damageDealt: participant.totalDamageDealtToChampions,
        itemIds: [
          participant.item0,
          participant.item1,
          participant.item2,
          participant.item3,
          participant.item4,
          participant.item5,
          participant.item6,
        ],
        teamId: participant.teamId,
      })),
    });

    await this.upsertChampionLearning(
      accountId,
      trackedParticipant,
      matchDto.info.gameDuration,
    );
  }

  private async upsertChampionLearning(
    accountId: string,
    participant: RiotMatchDto['info']['participants'][number],
    gameDurationSeconds: number,
  ) {
    const champion = participant.championName;
    const role = participant.teamPosition || 'UNKNOWN';
    const csTotal =
      participant.totalMinionsKilled + participant.neutralMinionsKilled;
    const csPerMin = csTotal / Math.max(gameDurationSeconds / 60, 1);

    const existing = await this.prisma.championLearning.findUnique({
      where: { accountId_champion_role: { accountId, champion, role } },
    });

    if (!existing) {
      await this.prisma.championLearning.create({
        data: {
          accountId,
          champion,
          role,
          games: 1,
          wins: participant.win ? 1 : 0,
          kdaK: participant.kills,
          kdaD: participant.deaths,
          kdaA: participant.assists,
          csMin: csPerMin,
        },
      });
      return;
    }

    const games = existing.games + 1;
    await this.prisma.championLearning.update({
      where: { id: existing.id },
      data: {
        games,
        wins: existing.wins + (participant.win ? 1 : 0),
        kdaK: this.weightedAverage(
          existing.kdaK,
          existing.games,
          participant.kills,
        ),
        kdaD: this.weightedAverage(
          existing.kdaD,
          existing.games,
          participant.deaths,
        ),
        kdaA: this.weightedAverage(
          existing.kdaA,
          existing.games,
          participant.assists,
        ),
        csMin: this.weightedAverage(existing.csMin, existing.games, csPerMin),
      },
    });
  }

  private weightedAverage(
    oldAverage: number,
    oldCount: number,
    newValue: number,
  ) {
    return (oldAverage * oldCount + newValue) / (oldCount + 1);
  }

  async listByAccount(accountId: string, page: number, pageSize: number) {
    const [items, total] = await Promise.all([
      this.prisma.matchParticipant.findMany({
        where: { accountId },
        include: { match: true },
        orderBy: { match: { gameCreation: 'desc' } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.matchParticipant.count({ where: { accountId } }),
    ]);

    const matchIds = items.map((item) => item.matchId);
    const siblings = matchIds.length
      ? await this.prisma.matchParticipant.findMany({
          where: { matchId: { in: matchIds } },
          select: { matchId: true, damageDealt: true },
        })
      : [];

    const damagesByMatch = new Map<string, number[]>();
    for (const sibling of siblings) {
      const list = damagesByMatch.get(sibling.matchId) ?? [];
      list.push(sibling.damageDealt);
      damagesByMatch.set(sibling.matchId, list);
    }

    const lpDeltaByItemId = await this.estimateLpDeltas(accountId, items);

    const enrichedItems = items.map((item) => ({
      ...item,
      damagePercentile: this.computeDamagePercentile(
        item.damageDealt,
        damagesByMatch.get(item.matchId) ?? [item.damageDealt],
      ),
      lpDelta: lpDeltaByItemId.get(item.id) ?? null,
    }));

    return { items: enrichedItems, total, page, pageSize };
  }

  private computeDamagePercentile(value: number, all: number[]) {
    if (all.length <= 1) return 100;
    const lessOrEqual = all.filter((entry) => entry <= value).length;
    return Math.round(((lessOrEqual - 1) / (all.length - 1)) * 100);
  }

  /**
   * Best-effort LP delta for ranked matches: Riot doesn't expose this
   * directly, so we bracket the match's end time between the two nearest
   * rank snapshots (from manual syncs or the periodic poller) and diff
   * their LP — but only when that's actually trustworthy: same tier/division
   * on both sides (no promotion/demotion math), and exactly one ranked game
   * of that queue played in the bracketed window (otherwise the delta would
   * be an aggregate across multiple games, not this one). Falls back to null
   * (rendered as "—") whenever either condition isn't met.
   */
  private async estimateLpDeltas(
    accountId: string,
    items: Array<{
      id: string;
      match: { queueId: number; gameCreation: Date; gameDuration: number };
    }>,
  ): Promise<Map<string, number | null>> {
    const deltas = new Map<string, number | null>();

    const neededQueues = new Set<QueueKey>();
    for (const item of items) {
      const key = RANKED_QUEUE_TO_KEY[item.match.queueId];
      if (key) neededQueues.add(key);
    }
    if (neededQueues.size === 0) return deltas;

    const snapshotsByQueue = new Map<
      QueueKey,
      Awaited<ReturnType<RankSnapshotsService['getAllHistory']>>
    >();
    for (const key of neededQueues) {
      snapshotsByQueue.set(key, await this.rankSnapshots.getAllHistory(accountId, key));
    }

    const rankedParticipants = await this.prisma.matchParticipant.findMany({
      where: { accountId, match: { queueId: { in: [420, 440] } } },
      select: {
        match: { select: { queueId: true, gameCreation: true, gameDuration: true } },
      },
    });
    const endTimesByQueue = new Map<QueueKey, number[]>();
    for (const participant of rankedParticipants) {
      const key = RANKED_QUEUE_TO_KEY[participant.match.queueId];
      if (!key) continue;
      const endTime =
        participant.match.gameCreation.getTime() + participant.match.gameDuration * 1000;
      const list = endTimesByQueue.get(key) ?? [];
      list.push(endTime);
      endTimesByQueue.set(key, list);
    }

    for (const item of items) {
      const key = RANKED_QUEUE_TO_KEY[item.match.queueId];
      if (!key) {
        deltas.set(item.id, null);
        continue;
      }

      const snapshots = snapshotsByQueue.get(key) ?? [];
      const endTime = item.match.gameCreation.getTime() + item.match.gameDuration * 1000;

      const before = [...snapshots].reverse().find((s) => s.capturedAt.getTime() <= endTime);
      const after = snapshots.find((s) => s.capturedAt.getTime() > endTime);

      if (!before || !after || before.tier !== after.tier || before.division !== after.division) {
        deltas.set(item.id, null);
        continue;
      }

      const windowMatchCount = (endTimesByQueue.get(key) ?? []).filter(
        (t) => t > before.capturedAt.getTime() && t <= after.capturedAt.getTime(),
      ).length;

      deltas.set(item.id, windowMatchCount === 1 ? after.lp - before.lp : null);
    }

    return deltas;
  }

  async findOne(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { matchId },
      include: { participants: { include: { account: true } } },
    });

    if (!match) {
      throw new NotFoundException('No se encontró la partida indicada.');
    }

    return match;
  }
}
