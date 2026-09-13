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
  MATCH_IDS_MAX_COUNT,
  RiotApiService,
  RiotMatchDto,
  type RiotLeagueEntryDto,
} from '../riot/riot-api.service';
import {
  QUEUE_IDS,
  QUEUE_KEY_BY_ID,
  RANKED_QUEUE_IDS,
  RIOT_QUEUE_TYPE_BY_KEY,
  type QueueKey,
} from '../common/queue';
import {
  computePeelIncidents,
  PEEL_SUPPORT_CHAMPIONS,
} from '../common/peel-support';
import { computeMidRoamFrames } from '../common/mid-roam';
import { getTeleportCasts } from '../common/summoner-spells';
import {
  deriveRoleProfile,
  roleMatchesProfile,
  RoleProfile,
} from '../common/role-profile';
import { getCurrentSeasonStart } from '../common/season';
import { rankTeammates, REMAKE_MAX_SECONDS } from './season-recovery';

// The match history view only ever shows ranked Solo/Duo and Flex games,
// regardless of what other queues get synced. Copied into a plain mutable
// array since Prisma's `in` filters want number[], not the shared readonly
// tuple.
const HISTORY_QUEUE_IDS: number[] = [...RANKED_QUEUE_IDS];

// Page size for the account's own history. Riot accepts up to
// MATCH_IDS_MAX_COUNT, but every new id on a page is also a match download,
// so pages stay the size of a round's download budget.
const PAGE_SIZE = 20;
// How many pages the top-up phase pages back through in one call. It only
// has to reach the history we already had, so this is just a guard against a
// runaway loop — anything deeper than this is the season backfill's job (see
// backfillSeason below), which resumes across calls instead of stretching a
// single HTTP request past its timeout.
const MAX_TOPUP_PAGES = 5;
// Initial backfill depth for a brand-new account link, matching the "20
// partidas por análisis" the app promises. Irrelevant once an account
// already has some history — see hasCaughtUp below.
const DEFAULT_TARGET_MATCH_COUNT = 20;
// Budget for the season backfill in a single sync call. Riot's development
// key allows ~95 requests per 2 minutes and each new match costs one match
// fetch (plus, sometimes, a timeline fetch), so a full season can't possibly
// be fetched in one request — it's split across successive calls, with the
// client re-calling until `seasonBackfill.done` comes back true.
const MAX_BACKFILL_MATCHES_PER_SYNC = 20;
// Pages of already-stored history the sweep is willing to re-verify in one
// call. These cost a single cheap list request each (no match fetches), and
// this cap only matters while re-verifying a long stretch of known games.
const MAX_BACKFILL_PAGES_PER_SYNC = 20;
// How long continuePendingBackfills keeps handing out rounds. A round can
// take about a minute, so this leaves room for the one in flight to finish
// inside Cloud Run's 300s request timeout (and inside the scheduler job's
// attempt deadline) instead of being cut off mid-page.
const BACKFILL_JOB_BUDGET_MS = 150_000;
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
// Season recovery, the fallback in recoverSeasonGames. How far past the
// season start Riot's own list has to end before its silence is worth
// second-guessing; a list ending right at the start is simply a full season.
const RECOVERY_MIN_WINDOW_MS = 24 * 60 * 60 * 1000;
// How many games wins + losses may exceed stored history by before any are
// considered missing, for the odd game the two sides don't classify alike.
const RECOVERY_TOLERANCE_GAMES = 5;
// Shared games (same team) a teammate needs to be worth searching through.
const RECOVERY_MIN_SHARED_GAMES = 3;
// Teammates searched per account and season before giving up on the rest.
const RECOVERY_MAX_CANDIDATES = 5;
// Downloads from a teammate's list without finding the account before that
// teammate is dropped: they weren't queueing together back then.
const RECOVERY_PROBE_MATCHES = 30;
// Match downloads per recovery round, the same share of the rate limit a
// season backfill round gets.
const MAX_RECOVERY_FETCHES_PER_ROUND = MAX_BACKFILL_MATCHES_PER_SYNC;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * True for Prisma's "unique constraint failed" (P2002), which for an upsert
 * means somebody else inserted the very row it was about to create.
 */
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);
  // Guards continuePendingBackfills against overlapping runs; see there.
  private isBackfilling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly riotApi: RiotApiService,
    private readonly rankSnapshots: RankSnapshotsService,
    private readonly discord: DiscordService,
    private readonly puuidRefresh: PuuidRefreshService,
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

        const resolved = await this.resolvePageIds(account.id, puuid, matchIds);
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

      const stored = await this.storeNewMatches(account, puuid, newIds);
      synced += stored.synced;

      // Only a page that stored cleanly may move the cursor: advancing past
      // a match we never managed to fetch would leave a hole nothing ever
      // goes back for.
      if (stored.failed === 0) {
        topUpCursor = await this.oldestGameCreation(matchIds);
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
   * Advances the season backfill of every account that still has one
   * pending, so a first full-season catch-up finishes on its own instead of
   * needing somebody to sit on the sync button (see the Cloud Scheduler job
   * in the deploy workflow, and BackfillPollerService for local dev).
   *
   * Accounts take turns one round at a time rather than one account being
   * drained before the next starts: they all share a single Riot key's rate
   * limit, so this way the newest linked account doesn't wait behind
   * somebody else's entire season. The call stops handing out rounds once
   * its time budget is spent, well inside Cloud Run's request timeout -
   * whatever is left simply continues on the next tick.
   */
  async continuePendingBackfills() {
    // Both triggers land here - Cloud Scheduler in production and the
    // in-process cron - and they run on the same five-minute beat, so
    // without a guard shared by both they overlap by design: two runs
    // walking the same accounts, spending the same rate limit twice and
    // racing each other to insert the same matches.
    if (this.isBackfilling) {
      this.logger.log('Backfill automatico ya en curso; se omite este tick.');
      return {
        accounts: 0,
        rounds: 0,
        synced: 0,
        recovered: 0,
        completed: 0,
        stillPending: 0,
        skipped: true,
      };
    }

    this.isBackfilling = true;
    try {
      return await this.runPendingBackfills();
    } finally {
      this.isBackfilling = false;
    }
  }

  private async runPendingBackfills() {
    const seasonStart = getCurrentSeasonStart();
    const startedAt = Date.now();

    const pending = await this.prisma.lolAccount.findMany({
      where: {
        OR: [
          { seasonBackfillDoneFor: null },
          { seasonBackfillDoneFor: { not: seasonStart } },
          { seasonRecoveryDoneFor: null },
          { seasonRecoveryDoneFor: { not: seasonStart } },
        ],
      },
      select: {
        id: true,
        summoner: true,
        tag: true,
        seasonBackfillDoneFor: true,
      },
      // Furthest from done first: an account whose sweep hasn't started
      // (null cursor) or is still up at recent games needs the budget more
      // than one already down near the start of the season.
      orderBy: { seasonBackfillCursor: { sort: 'desc', nulls: 'first' } },
    });

    // Riot's own list for the account always goes first; the recovery
    // fallback only takes the account's turns once that list has nothing
    // older left to give.
    const queue = pending.map((account) => ({
      ...account,
      backfillDone:
        account.seasonBackfillDoneFor?.getTime() === seasonStart.getTime(),
    }));
    let synced = 0;
    let recovered = 0;
    let completed = 0;
    let rounds = 0;

    while (
      queue.length > 0 &&
      Date.now() - startedAt < BACKFILL_JOB_BUDGET_MS
    ) {
      const account = queue.shift();
      if (!account) break;

      try {
        if (!account.backfillDone) {
          const result = await this.syncAccount(account.id);
          rounds += 1;
          synced += result.synced;
          account.backfillDone = result.seasonBackfill.done;
          queue.push(account);
        } else {
          const result = await this.recoverSeasonGames(account.id);
          rounds += 1;
          recovered += result.recovered;
          if (result.done) {
            completed += 1;
          } else {
            queue.push(account);
          }
        }
      } catch (error) {
        // Dropped from this tick's rotation, not from the job: its cursor
        // is untouched, so the next tick picks it up where it stopped.
        this.logger.warn(
          `No se pudo avanzar el backfill de ${account.summoner}#${account.tag}: ${error}`,
        );
      }
    }

    const stillPending = queue.length;
    this.logger.log(
      `Backfill automatico: ${rounds} ronda(s), ${synced} partida(s), ${recovered} recuperada(s) vía compañeros, ${completed} cuenta(s) completada(s), ${stillPending} pendiente(s).`,
    );

    return {
      accounts: pending.length,
      rounds,
      synced,
      recovered,
      completed,
      stillPending,
      skipped: false,
    };
  }

  /**
   * Fallback behind the season backfill, for an account whose own Riot match
   * list stops well short of the season start while its ranked wins + losses
   * show there are games before that point.
   *
   * Those games still exist in Riot; only this account's list stopped
   * returning them. Seen on a real account: nothing listed before 19/04,
   * while its duo's list had ~400 games from January to April with the
   * account in nearly every one. So they are looked for in the lists of the
   * teammates it plays with most, which is how trackers like League of
   * Graphs end up showing the full season.
   *
   * Runs only once backfillSeason is done, one budgeted round per call, with
   * progress kept per teammate so rounds resume where they stopped. Finishes
   * once nothing is missing, or once no teammate is left worth searching -
   * games played without a repeat teammate are out of its reach.
   */
  async recoverSeasonGames(accountId: string) {
    const seasonStart = getCurrentSeasonStart();
    const account = await this.prisma.lolAccount.findUnique({
      where: { id: accountId },
    });
    if (!account) {
      throw new NotFoundException('No se encontró la cuenta indicada.');
    }
    const label = `${account.summoner}#${account.tag}`;

    if (account.seasonRecoveryDoneFor?.getTime() === seasonStart.getTime()) {
      return { done: true, recovered: 0 };
    }

    const notifyRecovered = (recovered: number) => {
      if (recovered === 0) return;
      this.discord.notifySession(
        `🧩 Recuperación de temporada de **${label}**: ${recovered} partida(s) encontradas en las listas de sus compañeros de dúo.`,
      );
    };
    const finish = async (reason: string, recovered = 0) => {
      await this.prisma.lolAccount.update({
        where: { id: account.id },
        data: { seasonRecoveryDoneFor: seasonStart },
      });
      notifyRecovered(recovered);
      this.logger.log(`[Recuperación] ${label}: terminada (${reason}).`);
      return { done: true, recovered };
    };

    // Where Riot's own list for this account ends (the oldest game it gave).
    const listEnd = account.seasonBackfillCursor;
    if (!listEnd) {
      return finish('Riot no lista partidas de la temporada');
    }
    if (listEnd.getTime() - seasonStart.getTime() <= RECOVERY_MIN_WINDOW_MS) {
      return finish('la lista de Riot llega al inicio de la temporada');
    }

    const entries = await this.rankSnapshots.refreshAccountRank(account);
    if (!entries) {
      // Without fresh wins + losses there's no telling what is missing, and
      // assuming "nothing" would close the fallback for the whole season.
      this.logger.warn(
        `[Recuperación] ${label}: no se pudo leer el rango, se reintenta en el próximo ciclo.`,
      );
      return { done: false, recovered: 0 };
    }
    // The rank refresh renews a stale puuid when it has to.
    const refreshed = await this.prisma.lolAccount.findUnique({
      where: { id: account.id },
      select: { puuid: true },
    });
    const puuid = refreshed?.puuid ?? account.puuid;

    const missing = await this.countMissingSeasonGames(
      account.id,
      account.server,
      puuid,
      entries,
      seasonStart,
    );
    if (missing <= RECOVERY_TOLERANCE_GAMES) {
      return finish(`faltan ${missing} partida(s), dentro de la tolerancia`);
    }

    this.logger.log(
      `[Recuperación] ${label}: faltan ${missing} partida(s) y la lista de Riot no muestra nada antes del ${listEnd.toISOString().slice(0, 10)}; se buscan en las listas de compañeros frecuentes.`,
    );

    let fetched = 0;
    let recovered = 0;
    while (fetched < MAX_RECOVERY_FETCHES_PER_ROUND) {
      const candidate = await this.nextRecoveryCandidate(
        account.id,
        puuid,
        seasonStart,
        listEnd,
      );
      if (!candidate) {
        return finish('no quedan compañeros por revisar', recovered);
      }

      const sweep = await this.sweepRecoveryCandidate(
        account,
        puuid,
        candidate,
        seasonStart,
        MAX_RECOVERY_FETCHES_PER_ROUND - fetched,
      );
      fetched += sweep.fetched;
      recovered += sweep.recovered;
      // A teammate left unfinished ran out this round's budget, or hit a
      // match that has to be retried; the next round resumes with them.
      if (!sweep.done) break;
    }

    notifyRecovered(recovered);
    return { done: false, recovered };
  }

  /**
   * Games this season's ranked wins + losses count that aren't stored, per
   * queue. Remakes are left out of the stored side, since Riot counts them as
   * neither, and so are games played since the last sync: the next sync
   * brings those in, and they aren't what the fallback should search for.
   */
  private async countMissingSeasonGames(
    accountId: string,
    server: string,
    puuid: string,
    entries: RiotLeagueEntryDto[],
    seasonStart: Date,
  ) {
    const queues = [
      { queueId: QUEUE_IDS.SOLO, queueType: RIOT_QUEUE_TYPE_BY_KEY.solo },
      { queueId: QUEUE_IDS.FLEX, queueType: RIOT_QUEUE_TYPE_BY_KEY.flex },
    ];
    let missing = 0;

    for (const { queueId, queueType } of queues) {
      const entry = entries.find((item) => item.queueType === queueType);
      if (!entry) continue;

      const seasonGames = { queueId, gameCreation: { gte: seasonStart } };
      const stored = await this.prisma.matchParticipant.count({
        where: {
          accountId,
          match: { ...seasonGames, gameDuration: { gte: REMAKE_MAX_SECONDS } },
        },
      });
      let gap = entry.wins + entry.losses - stored;
      if (gap <= 0) continue;

      const newest = await this.prisma.match.findFirst({
        where: { ...seasonGames, participants: { some: { accountId } } },
        orderBy: { gameCreation: 'desc' },
        select: { gameCreation: true },
      });
      if (newest) {
        const recentIds = await this.riotApi.getMatchIdsByPuuid(server, puuid, {
          queue: queueId,
          startTime: Math.floor(newest.gameCreation.getTime() / 1000),
          count: MATCH_IDS_MAX_COUNT,
        });
        const { newIds } = await this.resolvePageIds(
          accountId,
          puuid,
          recentIds,
        );
        gap -= newIds.length;
      }

      missing += Math.max(0, gap);
    }

    return missing;
  }

  /**
   * The teammate the fallback should be searching: the one already in
   * progress, or else the most frequent same-team player from the account's
   * stored season games who hasn't been searched yet. Recomputed rather than
   * fixed up front, so a duo from months ago that only shows up in games
   * recovered through someone else gets a turn too.
   */
  private async nextRecoveryCandidate(
    accountId: string,
    puuid: string,
    seasonStart: Date,
    listEnd: Date,
  ) {
    const inProgress = await this.prisma.seasonRecoveryCandidate.findFirst({
      where: { accountId, season: seasonStart, done: false },
      orderBy: { sharedGames: 'desc' },
    });
    if (inProgress) return inProgress;

    const searched = await this.prisma.seasonRecoveryCandidate.findMany({
      where: { accountId, season: seasonStart },
      select: { puuid: true },
    });
    if (searched.length >= RECOVERY_MAX_CANDIDATES) return null;

    const ownGames = await this.prisma.matchParticipant.findMany({
      where: {
        accountId,
        match: {
          queueId: { in: HISTORY_QUEUE_IDS },
          gameCreation: { gte: seasonStart },
        },
      },
      select: { matchId: true, teamId: true },
    });
    if (ownGames.length === 0) return null;

    const lobbyPlayers = await this.prisma.matchParticipant.findMany({
      where: { matchId: { in: ownGames.map((game) => game.matchId) } },
      select: { matchId: true, teamId: true, puuid: true },
    });

    const searchedPuuids = new Set(searched.map((item) => item.puuid));
    const pick = rankTeammates(ownGames, lobbyPlayers, puuid).find(
      (teammate) =>
        teammate.sharedGames >= RECOVERY_MIN_SHARED_GAMES &&
        !searchedPuuids.has(teammate.puuid),
    );
    if (!pick) return null;

    this.logger.log(
      `[Recuperación] cuenta ${accountId}: se revisa la lista de un compañero con ${pick.sharedGames} partida(s) compartidas.`,
    );

    // Starts where the account's own list ends: everything newer than that
    // is already covered by the list itself.
    return this.prisma.seasonRecoveryCandidate.create({
      data: {
        accountId,
        season: seasonStart,
        puuid: pick.puuid,
        sharedGames: pick.sharedGames,
        cursor: listEnd,
      },
    });
  }

  /**
   * Walks one teammate's ranked list backwards from their cursor to the
   * season start, storing every game the account turns out to be in. Games
   * already stored cost nothing (all ten participants are stored with a
   * game, so it's already known whether the account played it); the rest
   * cost one download each, capped by `budget`.
   */
  private async sweepRecoveryCandidate(
    account: { id: string; server: string },
    puuid: string,
    candidate: {
      id: string;
      puuid: string;
      cursor: Date;
      lastMatchId: string | null;
      checked: number;
      recovered: number;
    },
    seasonStart: Date,
    budget: number,
  ) {
    const seasonStartSeconds = Math.floor(seasonStart.getTime() / 1000);
    let cursor = candidate.cursor;
    let lastMatchId = candidate.lastMatchId;
    let checked = candidate.checked;
    let totalRecovered = candidate.recovered;
    let fetched = 0;
    let recovered = 0;
    let done = false;
    let stalled = false;

    for (
      let page = 0;
      page < MAX_BACKFILL_PAGES_PER_SYNC &&
      !done &&
      !stalled &&
      fetched < budget;
      page += 1
    ) {
      if (cursor.getTime() <= seasonStart.getTime()) {
        done = true;
        break;
      }

      let ids: string[];
      try {
        ids = await this.riotApi.getMatchIdsByPuuid(
          account.server,
          candidate.puuid,
          {
            start: 0,
            count: MATCH_IDS_MAX_COUNT,
            type: 'ranked',
            startTime: seasonStartSeconds,
            // Rounded up like backfillSeason does: the last game checked
            // comes back as a one-id overlap (skipped below) instead of
            // risking the game right before it.
            endTime: Math.ceil(cursor.getTime() / 1000),
          },
        );
      } catch (error) {
        // A puuid stored under an earlier API key can't be read with the
        // current one: this teammate is out of reach, not a reason to fail.
        if (!isStalePuuidError(error)) throw error;
        done = true;
        break;
      }

      // Only an empty answer ends a teammate's list. A short page doesn't:
      // the next request, from the oldest game on it, confirms there is
      // nothing older instead of assuming it.
      const pageIds = ids.filter((id) => id !== lastMatchId);
      if (pageIds.length === 0) {
        done = true;
        break;
      }

      const known = await this.prisma.match.findMany({
        where: { matchId: { in: pageIds } },
        select: {
          matchId: true,
          gameCreation: true,
          participants: { where: { puuid }, select: { id: true } },
        },
      });
      const knownById = new Map(known.map((match) => [match.matchId, match]));
      const knownWithAccount = known
        .filter((match) => match.participants.length > 0)
        .map((match) => match.matchId);
      if (knownWithAccount.length > 0) {
        // Stored with the account in it, but possibly never linked to it.
        await this.resolvePageIds(account.id, puuid, knownWithAccount);
      }

      for (const matchId of pageIds) {
        const stored = knownById.get(matchId);
        if (stored) {
          cursor = stored.gameCreation;
          lastMatchId = matchId;
          continue;
        }
        if (fetched >= budget) break;

        let matchDto: RiotMatchDto;
        try {
          matchDto = await this.fetchMatchWithRetry(account.server, matchId);
        } catch (error) {
          // The cursor stays before this match, so the next round retries it
          // instead of paging past a game that might be the account's.
          stalled = true;
          this.logger.warn(
            `[Recuperación] No se pudo descargar la partida ${matchId} tras ${MATCH_FETCH_RETRIES} intentos: ${error}`,
          );
          break;
        }
        fetched += 1;
        checked += 1;

        if (matchDto.info.participants.some((p) => p.puuid === puuid)) {
          try {
            await this.storeMatch(account.id, account.server, puuid, matchDto);
          } catch (error) {
            stalled = true;
            this.logger.warn(
              `[Recuperación] No se pudo guardar la partida ${matchId}: ${error}`,
            );
            break;
          }
          recovered += 1;
          totalRecovered += 1;
        }

        cursor = new Date(matchDto.info.gameCreation);
        lastMatchId = matchId;

        if (totalRecovered === 0 && checked >= RECOVERY_PROBE_MATCHES) {
          done = true;
          break;
        }
      }
    }

    await this.prisma.seasonRecoveryCandidate.update({
      where: { id: candidate.id },
      data: {
        cursor,
        lastMatchId,
        checked,
        recovered: totalRecovered,
        done,
      },
    });
    this.logger.log(
      `[Recuperación] cuenta ${account.id}: ${fetched} partida(s) descargadas de la lista de un compañero, ${recovered} de la cuenta; revisado hasta el ${cursor.toISOString().slice(0, 10)}${done ? ', compañero terminado' : ''}.`,
    );

    return { fetched, recovered, done };
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
        const resolved = await this.resolvePageIds(account.id, puuid, matchIds);
        totals.relinked += resolved.relinked;
        totals.skipped += matchIds.length - resolved.newIds.length;

        const stored = await this.storeNewMatches(
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

        const oldest = await this.oldestGameCreation(matchIds);
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

  /**
   * Splits a page of Riot match ids into the ones this account still needs
   * stored, relinking along the way any participant row that is already in
   * the database but not attached to this account.
   *
   * A match already known globally (synced earlier via a different tracked
   * account that shared the game) can still be missing THIS account's own
   * participant row entirely - either it was never linked at the time
   * (participant row exists with accountId: null) or this account was
   * deleted and re-added since (deleting a LolAccount cascades its
   * MatchParticipant rows, but the shared Match row stays). Both cases
   * silently drop games unless they are checked for here instead of just
   * trusting "the match exists" and skipping it.
   */
  private async resolvePageIds(
    accountId: string,
    puuid: string,
    matchIds: string[],
  ): Promise<{ newIds: string[]; relinked: number }> {
    const existingMatches = await this.prisma.match.findMany({
      where: { matchId: { in: matchIds } },
      select: { id: true, matchId: true },
    });
    const internalIdByRiotId = new Map(
      existingMatches.map((match) => [match.matchId, match.id]),
    );

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

    const newIds = matchIds.filter((id) => {
      const internalId = internalIdByRiotId.get(id);
      return !internalId || !ourParticipantByInternalId.has(internalId);
    });

    let relinked = 0;
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
        data: { accountId },
      });
      relinked = result.count;
    }

    return { newIds, relinked };
  }

  /** Fetches and stores a page's worth of missing matches. */
  private async storeNewMatches(
    account: { id: string; server: string },
    puuid: string,
    newIds: string[],
  ): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    for (const matchId of newIds) {
      let matchDto: RiotMatchDto;

      try {
        matchDto = await this.fetchMatchWithRetry(account.server, matchId);
      } catch (error) {
        failed += 1;
        this.logger.warn(
          `No se pudo descargar la partida ${matchId} tras ${MATCH_FETCH_RETRIES} intentos: ${error}`,
        );
        continue;
      }

      try {
        await this.storeMatch(account.id, account.server, puuid, matchDto);
        synced += 1;
      } catch (error) {
        // Kept separate from the fetch failure above: this one is ours, not
        // Riot's, and reporting it as a failed download sent the last
        // investigation looking at the wrong system entirely.
        failed += 1;
        this.logger.warn(`No se pudo guardar la partida ${matchId}: ${error}`);
      }
    }

    return { synced, failed };
  }

  /** Oldest gameCreation among the given Riot match ids already stored. */
  private async oldestGameCreation(matchIds: string[]): Promise<Date | null> {
    const oldest = await this.prisma.match.findFirst({
      where: { matchId: { in: matchIds } },
      orderBy: { gameCreation: 'asc' },
      select: { gameCreation: true },
    });

    return oldest?.gameCreation ?? null;
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

  /**
   * Every timeline-derived lesson signal (peel incidents, mid-lane roaming)
   * shares a single Timeline API fetch per match instead of one call each —
   * that endpoint is the rate-limit-costly part, not the frame parsing. It's
   * also only worth paying for when the ACCOUNT BEING SYNCED is the one the
   * data would be attributed to (they're playing that role this game) AND
   * that role is actually their primary or secondary role historically —
   * otherwise the fetch just enriches a one-off autofill game (or some other,
   * likely-untracked player's row) that will never surface a role-specific
   * lesson anyway, since lessons.service.ts gates on that same primary/
   * secondary profile. A timeline fetch failure just means this one match's
   * derived fields stay null, same as any other match synced before this
   * tracking existed; it must never block storing the match itself.
   */
  private async computeTimelineDerivedStats(
    server: string,
    matchDto: RiotMatchDto,
    trackedParticipant: RiotMatchDto['info']['participants'][number],
    trackedAccountRoles: RoleProfile,
  ): Promise<
    Map<
      number,
      {
        peelAdcDeathsTracked?: number;
        peelAdcDeathsUnguarded?: number;
        midRoamFramesTracked?: number;
        midRoamFramesAway?: number;
      }
    >
  > {
    const result = new Map<
      number,
      {
        peelAdcDeathsTracked?: number;
        peelAdcDeathsUnguarded?: number;
        midRoamFramesTracked?: number;
        midRoamFramesAway?: number;
      }
    >();
    const participants = matchDto.info.participants;

    const trackedPlaysPeelRoleThisGame =
      (trackedParticipant.teamPosition === 'UTILITY' ||
        trackedParticipant.teamPosition === 'BOTTOM') &&
      roleMatchesProfile(
        [trackedParticipant.teamPosition],
        trackedAccountRoles,
      );
    const trackedPlaysMidThisGame =
      trackedParticipant.teamPosition === 'MIDDLE' &&
      roleMatchesProfile(['MIDDLE'], trackedAccountRoles);

    // Constrained to the tracked participant's own team: this is only worth
    // fetching for their own lane's peel dynamic, not an unrelated pair
    // elsewhere in the lobby.
    const support =
      trackedPlaysPeelRoleThisGame &&
      participants.find(
        (participant) =>
          participant.teamId === trackedParticipant.teamId &&
          participant.teamPosition === 'UTILITY' &&
          PEEL_SUPPORT_CHAMPIONS.includes(participant.championName),
      );
    const adc =
      support &&
      participants.find(
        (participant) =>
          participant.teamId === support.teamId &&
          participant.teamPosition === 'BOTTOM',
      );
    const mid =
      trackedPlaysMidThisGame &&
      participants.find((participant) => participant.teamPosition === 'MIDDLE');

    if (!(support && adc) && !mid) return result;

    try {
      const timeline = await this.riotApi.getMatchTimeline(
        server,
        matchDto.metadata.matchId,
      );

      if (support && adc) {
        const peelCounts = computePeelIncidents(
          timeline,
          support.participantId,
          adc.participantId,
        );
        // Same shared incident, written onto both rows — the support's copy
        // powers "No más escudos", the ADC's copy powers "Espera a tu
        // compañero" (see lessons-knowledge-base.json).
        const peelFields = {
          peelAdcDeathsTracked: peelCounts.tracked,
          peelAdcDeathsUnguarded: peelCounts.unguarded,
        };
        result.set(support.participantId, {
          ...result.get(support.participantId),
          ...peelFields,
        });
        result.set(adc.participantId, {
          ...result.get(adc.participantId),
          ...peelFields,
        });
      }

      if (mid) {
        const roamCounts = computeMidRoamFrames(timeline, mid.participantId);
        result.set(mid.participantId, {
          ...result.get(mid.participantId),
          midRoamFramesTracked: roamCounts.tracked,
          midRoamFramesAway: roamCounts.away,
        });
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo obtener el timeline de ${matchDto.metadata.matchId}: ${error instanceof Error ? error.message : error}`,
      );
    }

    return result;
  }

  /**
   * A lightweight, count-only query (not the full StatsService lane
   * distribution) — this only needs to know whether a role is worth an
   * extra Riot API call, not the account's full stats.
   */
  private async getAccountRoleProfile(accountId: string): Promise<RoleProfile> {
    const counts = await this.prisma.matchParticipant.groupBy({
      by: ['teamPosition'],
      where: { accountId },
      _count: { _all: true },
    });
    return deriveRoleProfile(
      counts.map((row) => ({
        lane: row.teamPosition,
        games: row._count._all,
      })),
    );
  }

  /**
   * Upsert of the shared Match row that tolerates losing a race for it.
   *
   * Two syncs can legitimately be storing the same game at the same time -
   * two tracked accounts who played in the same lobby, or the scheduled
   * backfill overlapping a manual sync - and an upsert is not atomic: both
   * can find the row missing and both try to insert it. The loser gets a
   * unique-constraint error describing exactly the state it wanted, so it
   * reads the winner's row instead of failing the whole match.
   */
  private async upsertMatchRow(server: string, matchDto: RiotMatchDto) {
    const create = {
      matchId: matchDto.metadata.matchId,
      server,
      gameCreation: new Date(matchDto.info.gameCreation),
      gameDuration: matchDto.info.gameDuration,
      gameMode: matchDto.info.gameMode,
      gameVersion: matchDto.info.gameVersion,
      queueId: matchDto.info.queueId,
    };

    try {
      return await this.prisma.match.upsert({
        where: { matchId: matchDto.metadata.matchId },
        create,
        update: {},
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;

      const existing = await this.prisma.match.findUnique({
        where: { matchId: matchDto.metadata.matchId },
      });
      if (!existing) throw error;
      return existing;
    }
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
    const match = await this.upsertMatchRow(server, matchDto);

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

    const trackedAccountRoles = await this.getAccountRoleProfile(accountId);
    const timelineStatsByParticipantId = await this.computeTimelineDerivedStats(
      server,
      matchDto,
      trackedParticipant,
      trackedAccountRoles,
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
          peelAdcDeathsTracked:
            timelineStatsByParticipantId.get(participant.participantId)
              ?.peelAdcDeathsTracked ?? null,
          peelAdcDeathsUnguarded:
            timelineStatsByParticipantId.get(participant.participantId)
              ?.peelAdcDeathsUnguarded ?? null,
          midRoamFramesTracked:
            timelineStatsByParticipantId.get(participant.participantId)
              ?.midRoamFramesTracked ?? null,
          midRoamFramesAway:
            timelineStatsByParticipantId.get(participant.participantId)
              ?.midRoamFramesAway ?? null,
          teleportCasts: getTeleportCasts(participant),
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
