import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DiscordService } from '../discord/discord.service';
import { PrismaService } from '../prisma/prisma.service';
import { RankSnapshotsService } from '../rank-snapshots/rank-snapshots.service';
import { PuuidRefreshService } from '../riot/puuid-refresh.service';
import {
  isStalePuuidError,
  RiotApiService,
  RiotMatchDto,
} from '../riot/riot-api.service';
import {
  QUEUE_KEY_BY_ID,
  RANKED_QUEUE_IDS,
  type QueueKey,
} from '../common/queue';

// The match history view only ever shows ranked Solo/Duo and Flex games,
// regardless of what other queues get synced. Copied into a plain mutable
// array since Prisma's `in` filters want number[], not the shared readonly
// tuple.
const HISTORY_QUEUE_IDS: number[] = [...RANKED_QUEUE_IDS];

// Riot's match-ids endpoint accepts up to 20 per page.
const PAGE_SIZE = 20;
// How many pages of history we're willing to page back through in one sync
// call, as a safety cap against runaway loops for brand-new accounts with a
// long ranked history (normal top-ups stop far sooner, see hasCaughtUp
// below).
const MAX_BACKFILL_PAGES = 5;
// Initial backfill depth for a brand-new account link, matching the "20
// partidas por análisis" the app promises. Irrelevant once an account
// already has some history — see hasCaughtUp below.
const DEFAULT_TARGET_MATCH_COUNT = 20;
// A single match can transiently 404 right after it finishes (Riot's match
// details lag slightly behind the ids list). Retry with backoff instead of
// giving up — we'd rather a sync take longer than silently skip a recent
// match and let older ones fill in for it.
const MATCH_FETCH_RETRIES = 5;
const MATCH_FETCH_RETRY_DELAY_MS = 3000;
// Riot's match-ids list endpoint can itself serve a stale cached response
// for a short while right after a new game finishes (different edge nodes
// catch up at different times) — so "nothing new" on the freshest page
// isn't trusted until it's confirmed a couple of times.
const LIST_RECHECK_ATTEMPTS = 4;
const LIST_RECHECK_DELAY_MS = 5000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly riotApi: RiotApiService,
    private readonly rankSnapshots: RankSnapshotsService,
    private readonly discord: DiscordService,
    private readonly puuidRefresh: PuuidRefreshService,
  ) {}

  async syncAccount(
    accountId: string,
    targetCount = DEFAULT_TARGET_MATCH_COUNT,
  ) {
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

    // Counted as ranked-only so the backfill target below means "20 ranked
    // matches", matching what the history view actually shows — not diluted
    // by older normal/ARAM games synced before ranked-only syncing.
    const storedCount = await this.prisma.matchParticipant.count({
      where: {
        accountId: account.id,
        match: { queueId: { in: HISTORY_QUEUE_IDS } },
      },
    });

    let puuid = account.puuid;
    let synced = 0;
    let skipped = 0;
    let relinked = 0;
    let totalFetched = 0;
    let start = 0;

    // Page 0 always runs first (even if we already have plenty stored) so
    // newly played games get picked up; later pages only run if we're still
    // short of the target depth, backfilling further into history.
    for (let page = 0; page < MAX_BACKFILL_PAGES; page += 1) {
      const isFirstPage = page === 0;
      const listAttempts = isFirstPage ? LIST_RECHECK_ATTEMPTS : 1;
      let matchIds: string[] = [];
      let newIds: string[] = [];

      for (let listAttempt = 1; listAttempt <= listAttempts; listAttempt += 1) {
        try {
          matchIds = await this.riotApi.getMatchIdsByPuuid(
            account.server,
            puuid,
            {
              start,
              count: PAGE_SIZE,
              type: 'ranked',
            },
          );
        } catch (error) {
          // The stored puuid can go stale if the Riot API key was rotated
          // since this account was last resolved; only worth retrying once,
          // right at the start of the sync.
          if (page > 0 || !isStalePuuidError(error)) throw error;
          puuid = await this.puuidRefresh.refresh(account);
          matchIds = await this.riotApi.getMatchIdsByPuuid(
            account.server,
            puuid,
            {
              start,
              count: PAGE_SIZE,
              type: 'ranked',
            },
          );
        }

        if (matchIds.length === 0) break;

        const existingMatches = await this.prisma.match.findMany({
          where: { matchId: { in: matchIds } },
          select: { id: true, matchId: true },
        });
        const internalIdByRiotId = new Map(
          existingMatches.map((match) => [match.matchId, match.id]),
        );

        // A match already known globally (synced earlier via a different
        // tracked account that shared the game) can still be missing THIS
        // account's own participant row entirely — either it was never
        // linked at the time (participant row exists with accountId: null)
        // or this account was deleted and re-added since (deleting a
        // LolAccount cascades its MatchParticipant rows, but the shared
        // Match row stays). Both cases silently drop this account's most
        // recent games unless we check for them here instead of just
        // trusting "the match exists" and skipping it.
        const ourParticipants = existingMatches.length
          ? await this.prisma.matchParticipant.findMany({
              where: {
                matchId: { in: [...internalIdByRiotId.values()] },
                puuid,
              },
              select: { matchId: true, accountId: true },
            })
          : [];
        const ourParticipantByInternalId = new Map(
          ourParticipants.map((p) => [p.matchId, p]),
        );

        newIds = matchIds.filter((id) => {
          const internalId = internalIdByRiotId.get(id);
          return !internalId || !ourParticipantByInternalId.has(internalId);
        });

        let relinkedThisAttempt = 0;
        const orphanedInternalIds = ourParticipants
          .filter((p) => p.accountId === null)
          .map((p) => p.matchId);
        if (orphanedInternalIds.length > 0) {
          const result = await this.prisma.matchParticipant.updateMany({
            where: {
              matchId: { in: orphanedInternalIds },
              puuid,
              accountId: null,
            },
            data: { accountId: account.id },
          });
          relinkedThisAttempt = result.count;
          relinked += relinkedThisAttempt;
        }

        // Riot's match-ids list endpoint can itself serve a stale cached
        // response for a short while right after a new game finishes —
        // only worth rechecking when this page looked like it found
        // nothing at all (no new match, nothing to relink either).
        const looksStale =
          isFirstPage &&
          newIds.length === 0 &&
          relinkedThisAttempt === 0 &&
          listAttempt < listAttempts;
        if (!looksStale) break;
        await sleep(LIST_RECHECK_DELAY_MS);
      }

      if (matchIds.length === 0) break;
      totalFetched += matchIds.length;
      skipped += matchIds.length - newIds.length;

      for (const matchId of newIds) {
        try {
          const matchDto = await this.fetchMatchWithRetry(
            account.server,
            matchId,
          );
          await this.storeMatch(account.id, account.server, puuid, matchDto);
          synced += 1;
        } catch (error) {
          this.logger.warn(
            `No se pudo sincronizar la partida ${matchId} tras ${MATCH_FETCH_RETRIES} intentos: ${error}`,
          );
        }
      }

      // Once a page contains a match we already had stored, everything
      // older than it is guaranteed to be already-synced too — stop right
      // there instead of continuing to page back into history just to hit
      // targetCount. That backfill target only matters for a brand-new
      // account's very first sync (an all-new page keeps it paging).
      const hasCaughtUpToKnownHistory = newIds.length < matchIds.length;
      const hasReachedTarget = storedCount + synced >= targetCount;
      const hasReachedEndOfHistory = matchIds.length < PAGE_SIZE;
      if (
        hasCaughtUpToKnownHistory ||
        hasReachedTarget ||
        hasReachedEndOfHistory
      )
        break;

      start += PAGE_SIZE;
    }

    await this.rankSnapshots.refreshAccountRank({ ...account, puuid });

    if (synced > 0 || relinked > 0) {
      this.discord.notifySession(
        `🔄 Sync de **${account.summoner}#${account.tag}**: ${synced} partida(s) nueva(s)` +
          (relinked > 0
            ? `, ${relinked} recuperada(s) de cuentas compartidas.`
            : '.'),
      );
    }

    return { synced, skipped, relinked, totalFetched };
  }

  private async fetchMatchWithRetry(
    server: string,
    matchId: string,
  ): Promise<RiotMatchDto> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MATCH_FETCH_RETRIES; attempt += 1) {
      try {
        return await this.riotApi.getMatchById(server, matchId);
      } catch (error) {
        lastError = error;
        if (attempt < MATCH_FETCH_RETRIES) {
          await sleep(attempt * MATCH_FETCH_RETRY_DELAY_MS);
        }
      }
    }
    throw lastError;
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

    // Upsert, not create: the match itself (or some of its participants) can
    // already exist if another tracked account shared the game and synced
    // it first, or if this account was deleted and re-added — deleting a
    // LolAccount cascades its own MatchParticipant rows but never touches
    // the shared Match row.
    const match = await this.prisma.match.upsert({
      where: { matchId: matchDto.metadata.matchId },
      create: {
        matchId: matchDto.metadata.matchId,
        server,
        gameCreation: new Date(matchDto.info.gameCreation),
        gameDuration: matchDto.info.gameDuration,
        gameMode: matchDto.info.gameMode,
        gameVersion: matchDto.info.gameVersion,
        queueId: matchDto.info.queueId,
      },
      update: {},
    });

    const knownAccounts = await this.prisma.lolAccount.findMany({
      where: { puuid: { in: participants.map((entry) => entry.puuid) } },
      select: { id: true, puuid: true },
    });
    const accountIdByPuuid = new Map(
      knownAccounts.map((account) => [account.puuid, account.id]),
    );
    accountIdByPuuid.set(puuid, accountId);

    const objectivesByTeam = new Map(
      matchDto.info.teams.map((team) => [team.teamId, team.objectives]),
    );

    // skipDuplicates so re-running this for an already-known match only
    // inserts the participant rows that are actually missing (this
    // account's own, most commonly) without erroring on the ones other
    // accounts already stored.
    await this.prisma.matchParticipant.createMany({
      skipDuplicates: true,
      data: participants.map((participant) => {
        const teamObjectives = objectivesByTeam.get(participant.teamId);
        return {
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
          killParticipation: participant.challenges?.killParticipation ?? null,
          teamDamagePercentage:
            participant.challenges?.teamDamagePercentage ?? null,
          soloKills: participant.challenges?.soloKills ?? null,
          turretTakedowns: participant.challenges?.turretTakedowns ?? null,
          maxLevelLeadLaneOpponent:
            participant.challenges?.maxLevelLeadLaneOpponent ?? null,
          maxCsAdvantageOnLaneOpponent:
            participant.challenges?.maxCsAdvantageOnLaneOpponent ?? null,
          dragonTakedowns: participant.challenges?.dragonTakedowns ?? null,
          baronTakedowns: participant.challenges?.baronTakedowns ?? null,
          riftHeraldTakedowns:
            participant.challenges?.riftHeraldTakedowns ?? null,
          controlWardsPlaced:
            participant.challenges?.controlWardsPlaced ?? null,
          teamDragonKills: teamObjectives?.dragon.kills ?? null,
          teamBaronKills: teamObjectives?.baron.kills ?? null,
          teamRiftHeraldKills: teamObjectives?.riftHerald.kills ?? null,
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
        };
      }),
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
    const where = { accountId, match: { queueId: { in: HISTORY_QUEUE_IDS } } };

    const [items, total] = await Promise.all([
      this.prisma.matchParticipant.findMany({
        where,
        include: { match: true },
        orderBy: { match: { gameCreation: 'desc' } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.matchParticipant.count({ where }),
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
      const key = QUEUE_KEY_BY_ID[item.match.queueId];
      if (key) neededQueues.add(key);
    }
    if (neededQueues.size === 0) return deltas;

    const snapshotsByQueue = new Map<
      QueueKey,
      Awaited<ReturnType<RankSnapshotsService['getAllHistory']>>
    >();
    for (const key of neededQueues) {
      snapshotsByQueue.set(
        key,
        await this.rankSnapshots.getAllHistory(accountId, key),
      );
    }

    const rankedParticipants = await this.prisma.matchParticipant.findMany({
      where: { accountId, match: { queueId: { in: HISTORY_QUEUE_IDS } } },
      select: {
        match: {
          select: { queueId: true, gameCreation: true, gameDuration: true },
        },
      },
    });
    const endTimesByQueue = new Map<QueueKey, number[]>();
    for (const participant of rankedParticipants) {
      const key = QUEUE_KEY_BY_ID[participant.match.queueId];
      if (!key) continue;
      const endTime =
        participant.match.gameCreation.getTime() +
        participant.match.gameDuration * 1000;
      const list = endTimesByQueue.get(key) ?? [];
      list.push(endTime);
      endTimesByQueue.set(key, list);
    }

    for (const item of items) {
      const key = QUEUE_KEY_BY_ID[item.match.queueId];
      if (!key) {
        deltas.set(item.id, null);
        continue;
      }

      const snapshots = snapshotsByQueue.get(key) ?? [];
      const endTime =
        item.match.gameCreation.getTime() + item.match.gameDuration * 1000;

      const before = [...snapshots]
        .reverse()
        .find((s) => s.capturedAt.getTime() <= endTime);
      const after = snapshots.find((s) => s.capturedAt.getTime() > endTime);

      if (
        !before ||
        !after ||
        before.tier !== after.tier ||
        before.division !== after.division
      ) {
        deltas.set(item.id, null);
        continue;
      }

      const windowMatchCount = (endTimesByQueue.get(key) ?? []).filter(
        (t) =>
          t > before.capturedAt.getTime() && t <= after.capturedAt.getTime(),
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
