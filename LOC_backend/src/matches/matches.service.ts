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
import { isStalePuuidError, RiotApiService } from '../riot/riot-api.service';
import { HISTORY_QUEUE_IDS } from '../common/queue';
import { getCurrentSeasonStart } from '../common/season';
import { MatchIngestService } from './match-ingest.service';
import { sleep } from '../common/sleep';
import {
  DEFAULT_TARGET_MATCH_COUNT,
  MAX_BACKFILL_MATCHES_PER_SYNC,
  MAX_BACKFILL_PAGES_PER_SYNC,
  MAX_TOPUP_PAGES,
  PAGE_SIZE,
} from './sync-budgets';

// Riot's match-ids list endpoint can itself serve a stale cached response
// for a short while right after a new game finishes (different edge nodes
// catch up at different times) — so "nothing new" on the freshest page
// isn't trusted until it's confirmed a couple of times.
const LIST_RECHECK_ATTEMPTS = 4;
const LIST_RECHECK_DELAY_MS = 5000;

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);
  // Guards continuePendingBackfills against overlapping runs; see there.

  constructor(
    private readonly prisma: PrismaService,
    private readonly riotApi: RiotApiService,
    private readonly rankSnapshots: RankSnapshotsService,
    private readonly discord: DiscordService,
    private readonly puuidRefresh: PuuidRefreshService,
    private readonly ingest: MatchIngestService,
  ) {}

  /**
   * Brings this account's stored ranked history in line with Riot's, in two
   * phases:
   *
   * 1. **Top-up** - pages from the newest game backwards until it reaches
   *    history we already had, so games played since the last sync show up
   *    right away.
   * 2. **Season backfill** - keeps paging further back, in budgeted chunks
   *    spread across successive calls, until every ranked game of the
   *    current season is stored (see `backfillSeason`).
   *
   * Phase 2 is what makes Pool Champ and Aprendizaje agree with external
   * trackers: those features scope themselves to the full season the same
   * way League of Graphs or OP.GG do, so with only the last ~20 games ever
   * stored, a champion the player actually has 60 season games on showed up
   * with 3 games and a meaningless 100% winrate.
   */
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
    // matches", matching what the history view actually shows - not diluted
    // by older normal/ARAM games synced before ranked-only syncing.
    const storedCount = await this.prisma.matchParticipant.count({
      where: {
        accountId: account.id,
        match: { queueId: { in: HISTORY_QUEUE_IDS } },
      },
    });

    const seasonStart = getCurrentSeasonStart();
    // While a season backfill is still pending, the freshest page is the
    // least of our problems: we're chasing months of history, not a game
    // that ended seconds ago, so the stale-list recheck below is pure
    // waiting. It comes back once the season is covered.
    const hasPendingSeasonBackfill =
      account.seasonBackfillDoneFor?.getTime() !== seasonStart.getTime();

    let puuid = account.puuid;
    let synced = 0;
    let skipped = 0;
    let relinked = 0;
    let totalFetched = 0;
    let start = 0;
    // Whether the top-up reached history we already had (or the end of this
    // account's ranked history). When it doesn't, more games were played
    // between syncs than the page cap covers, which reopens a gap the season
    // backfill has to close.
    let caughtUp = false;
    let reachedEndOfHistory = false;
    // Oldest game the top-up confirmed stored, and therefore where the
    // season backfill can pick up without re-checking anything newer.
    let topUpCursor: Date | null = null;

    // Page 0 always runs first (even if we already have plenty stored) so
    // newly played games get picked up; later pages only run while the
    // top-up still hasn't met the history we already had.
    for (let page = 0; page < MAX_TOPUP_PAGES; page += 1) {
      const isFirstPage = page === 0;
      const listAttempts =
        isFirstPage && !hasPendingSeasonBackfill ? LIST_RECHECK_ATTEMPTS : 1;
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

        const resolved = await this.ingest.resolvePageIds(
          account.id,
          puuid,
          matchIds,
        );
        newIds = resolved.newIds;
        relinked += resolved.relinked;

        // Riot's match-ids list endpoint can itself serve a stale cached
        // response for a short while right after a new game finishes -
        // only worth rechecking when this page looked like it found
        // nothing at all (no new match, nothing to relink either).
        const looksStale =
          isFirstPage &&
          newIds.length === 0 &&
          resolved.relinked === 0 &&
          listAttempt < listAttempts;
        if (!looksStale) break;
        await sleep(LIST_RECHECK_DELAY_MS);
      }

      if (matchIds.length === 0) {
        caughtUp = true;
        reachedEndOfHistory = true;
        break;
      }

      totalFetched += matchIds.length;
      skipped += matchIds.length - newIds.length;

      const stored = await this.ingest.storeNewMatches(account, puuid, newIds);
      synced += stored.synced;

      // Only a page that stored cleanly may move the cursor: advancing past
      // a match we never managed to fetch would leave a hole nothing ever
      // goes back for.
      if (stored.failed === 0) {
        topUpCursor = await this.ingest.oldestGameCreation(matchIds);
      }

      // Once a page contains a match we already had stored, everything
      // older than it was reached by an earlier sync too - stop paging here
      // and let the season backfill decide whether that older history is
      // actually complete.
      const hasCaughtUpToKnownHistory = newIds.length < matchIds.length;
      // Riot has nothing older to give: this account's entire ranked
      // history is stored, so the current season certainly is.
      const hasReachedEndOfHistory = matchIds.length < PAGE_SIZE;
      // The 20-match target only applies to a brand-new account's very
      // first sync; for an account that already had history it must not cut
      // the top-up short, or a page that's entirely new (more games played
      // than the target since the last sync) would stop the loop right
      // there and strand everything in between.
      const hasReachedTarget = storedCount === 0 && synced >= targetCount;

      if (hasCaughtUpToKnownHistory || hasReachedEndOfHistory) {
        caughtUp = true;
        reachedEndOfHistory = hasReachedEndOfHistory;
        break;
      }
      if (hasReachedTarget || stored.failed > 0) break;

      start += PAGE_SIZE;
    }

    let cursor = account.seasonBackfillCursor;
    let doneFor = account.seasonBackfillDoneFor;
    if (reachedEndOfHistory) {
      // The top-up walked contiguously from the newest game to the oldest
      // one Riot has, so there is nothing left to backfill for any season.
      cursor = topUpCursor ?? cursor;
      doneFor = seasonStart;
    } else if (!caughtUp) {
      // A gap opened up between the newest games and the history we had, so
      // the sweep restarts from the deepest point this top-up confirmed.
      cursor = topUpCursor;
      doneFor = null;
    }

    const backfill = await this.backfillSeason(
      account,
      puuid,
      seasonStart,
      cursor,
      doneFor,
    );
    synced += backfill.synced;
    skipped += backfill.skipped;
    relinked += backfill.relinked;
    totalFetched += backfill.totalFetched;

    await this.rankSnapshots.refreshAccountRank({ ...account, puuid });

    if (synced > 0 || relinked > 0) {
      this.discord.notifySession(
        `🔄 Sync de **${account.summoner}#${account.tag}**: ${synced} partida(s) nueva(s)` +
          (relinked > 0
            ? `, ${relinked} recuperada(s) de cuentas compartidas`
            : '') +
          (backfill.done
            ? '.'
            : ' (historial de la temporada aún incompleto, continúa en el próximo sync).'),
      );
    }

    return {
      synced,
      skipped,
      relinked,
      totalFetched,
      seasonBackfill: {
        // false means there is still season history left to fetch and the
        // client should call sync again; the numbers Pool Champ and
        // Aprendizaje show are partial until this turns true.
        done: backfill.done,
        seasonStart,
        oldestSyncedAt: backfill.oldestSyncedAt,
      },
    };
  }

  /**
   * Walks backwards through the current season's ranked history until every
   * game of it is stored, a chunk at a time.
   *
   * Paging uses Riot's `endTime` filter rather than the `start` offset, so a
   * sweep interrupted by this call's budget resumes exactly where it left
   * off on the next call instead of re-walking from the newest game - the
   * cursor (the oldest game confirmed stored) is persisted on the account.
   * A sweep that has never completed for this season starts from "now" and
   * re-verifies the already-stored pages on the way down, which costs one
   * list request per page and no match fetches, and repairs any hole left
   * behind by earlier versions of this sync.
   */
  private async backfillSeason(
    account: { id: string; server: string },
    puuid: string,
    seasonStart: Date,
    cursor: Date | null,
    doneFor: Date | null,
  ) {
    const totals = { synced: 0, skipped: 0, relinked: 0, totalFetched: 0 };
    let done = doneFor !== null && doneFor.getTime() === seasonStart.getTime();
    let nextCursor = cursor;

    if (!done) {
      const seasonStartSeconds = Math.floor(seasonStart.getTime() / 1000);
      let sweepFrom = cursor ?? new Date();

      for (let page = 0; page < MAX_BACKFILL_PAGES_PER_SYNC; page += 1) {
        if (sweepFrom.getTime() <= seasonStart.getTime()) {
          done = true;
          break;
        }
        // Checked with a whole page of room to spare, so a call fetches at
        // most this many new matches instead of overshooting by a page and
        // stretching the request past a proxy's timeout. Pages that turn out
        // to be already stored cost no match fetches and no budget.
        if (totals.synced + PAGE_SIZE > MAX_BACKFILL_MATCHES_PER_SYNC) break;

        const matchIds = await this.riotApi.getMatchIdsByPuuid(
          account.server,
          puuid,
          {
            start: 0,
            count: PAGE_SIZE,
            type: 'ranked',
            startTime: seasonStartSeconds,
            // Rounded up so the cursor game itself comes back as a harmless
            // one-match overlap instead of risking a skipped game right at
            // the boundary; it is already stored, so it costs nothing.
            endTime: Math.ceil(sweepFrom.getTime() / 1000),
          },
        );

        if (matchIds.length === 0) {
          done = true;
          break;
        }

        totals.totalFetched += matchIds.length;
        const resolved = await this.ingest.resolvePageIds(
          account.id,
          puuid,
          matchIds,
        );
        totals.relinked += resolved.relinked;
        totals.skipped += matchIds.length - resolved.newIds.length;

        const stored = await this.ingest.storeNewMatches(
          account,
          puuid,
          resolved.newIds,
        );
        totals.synced += stored.synced;

        if (stored.failed > 0) {
          // Leave the cursor untouched so the next sync retries this exact
          // page: a slower sweep beats one that pages past a match it never
          // managed to store.
          this.logger.warn(
            `Backfill de temporada pausado para ${account.id}: ${stored.failed} partida(s) sin poder sincronizarse, se reintentan en el próximo sync.`,
          );
          break;
        }

        const oldest = await this.ingest.oldestGameCreation(matchIds);
        if (!oldest || oldest.getTime() >= sweepFrom.getTime()) {
          // The cursor is not moving, which `endTime` should make
          // impossible; bail out instead of looping on the same page.
          break;
        }

        sweepFrom = oldest;
        nextCursor = oldest;

        if (matchIds.length < PAGE_SIZE) {
          done = true;
          break;
        }
      }
    }

    await this.prisma.lolAccount.update({
      where: { id: account.id },
      data: {
        seasonBackfillCursor: nextCursor,
        seasonBackfillDoneFor: done ? seasonStart : null,
      },
    });

    return { ...totals, done, oldestSyncedAt: nextCursor };
  }
}
