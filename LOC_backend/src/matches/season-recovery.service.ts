import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DiscordService } from '../discord/discord.service';
import { PrismaService } from '../prisma/prisma.service';
import { RankSnapshotsService } from '../rank-snapshots/rank-snapshots.service';
import {
  isStalePuuidError,
  MATCH_IDS_MAX_COUNT,
  RiotApiService,
  RiotMatchDto,
  type RiotLeagueEntryDto,
} from '../riot/riot-api.service';
import {
  HISTORY_QUEUE_IDS,
  QUEUE_IDS,
  RIOT_QUEUE_TYPE_BY_KEY,
} from '../common/queue';
import { getCurrentSeasonStart } from '../common/season';
import { rankTeammates, REMAKE_MAX_SECONDS } from './season-recovery';
import {
  MATCH_FETCH_RETRIES,
  MatchIngestService,
} from './match-ingest.service';
import {
  MAX_BACKFILL_PAGES_PER_SYNC,
  MAX_RECOVERY_FETCHES_PER_ROUND,
} from './sync-budgets';

// How far past the season start Riot's own list has to end before its
// silence is worth second-guessing; a list ending right at the start is
// simply a full season.
const RECOVERY_MIN_WINDOW_MS = 24 * 60 * 60 * 1000;
// How many games wins + losses may exceed stored history by before any are
// considered missing, for the odd game the two sides don't classify alike.
const RECOVERY_TOLERANCE_GAMES = 5;
// Shared games (same team) a teammate needs to be worth searching through.
const RECOVERY_MIN_SHARED_GAMES = 3;
// How many of the account's oldest stored season games teammates are ranked
// on. The missing games sit right before those, so whoever the account was
// queueing with then is the one whose list reaches them - not whoever it plays
// with most across the season, who may have started after the gap (seen on a
// real account: its two most frequent teammates had no games at all before
// the point its own list stopped).
const RECOVERY_RANKING_GAMES = 60;
// Teammates searched per account and season before giving up on the rest.
// Only teammates whose list actually had games in the missing window count:
// an empty list costs a single request and says nothing about the rest.
const RECOVERY_MAX_CANDIDATES = 5;
// Downloads from a teammate's list without finding the account before that
// teammate is dropped: they weren't queueing together back then.
const RECOVERY_PROBE_MATCHES = 30;

/**
 * Último recurso cuando la propia lista de Riot deja de devolver partidas de
 * la temporada: las busca en las listas de los compañeros con los que la
 * cuenta más juega. Corre solo cuando el backfill de temporada ya terminó, y
 * avanza en rondas con presupuesto para no agotar el límite de peticiones.
 */
@Injectable()
export class SeasonRecoveryService {
  private readonly logger = new Logger(SeasonRecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly riotApi: RiotApiService,
    private readonly rankSnapshots: RankSnapshotsService,
    private readonly discord: DiscordService,
    private readonly ingest: MatchIngestService,
  ) {}

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
        const { newIds } = await this.ingest.resolvePageIds(
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
   * progress, or else the most frequent same-team player in the account's
   * oldest stored season games (see RECOVERY_RANKING_GAMES) who hasn't been
   * searched yet. Recomputed rather than fixed up front: as recovered games
   * push the oldest stored games further back, the duo from that earlier
   * stretch rises to the top and gets a turn too.
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
      select: { puuid: true, checked: true },
    });
    const searchedWithGames = searched.filter((item) => item.checked > 0);
    if (searchedWithGames.length >= RECOVERY_MAX_CANDIDATES) return null;

    const ownGames = await this.prisma.matchParticipant.findMany({
      where: {
        accountId,
        match: {
          queueId: { in: HISTORY_QUEUE_IDS },
          gameCreation: { gte: seasonStart },
        },
      },
      orderBy: { match: { gameCreation: 'asc' } },
      take: RECOVERY_RANKING_GAMES,
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
        await this.ingest.resolvePageIds(account.id, puuid, knownWithAccount);
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
          matchDto = await this.ingest.fetchMatchWithRetry(
            account.server,
            matchId,
          );
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
            await this.ingest.storeMatch(
              account.id,
              account.server,
              puuid,
              matchDto,
            );
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
}
