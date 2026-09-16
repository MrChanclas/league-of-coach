import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiotApiService, RiotMatchDto } from '../riot/riot-api.service';
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
import { sleep } from '../common/sleep';

// A single match can transiently 404 right after it finishes (Riot's match
// details lag slightly behind the ids list). Retry with backoff instead of
// giving up — we'd rather a sync take longer than silently skip a recent
// match and let older ones fill in for it.
export const MATCH_FETCH_RETRIES = 5;
const MATCH_FETCH_RETRY_DELAY_MS = 3000;

/**
 * True for Prisma's "unique constraint failed" (P2002), which for an upsert
 * means somebody else inserted the very row it was about to create.
 */
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

/**
 * Descarga y guardado de partidas: todo lo que convierte un id de Riot en
 * filas de la base. Lo comparten los tres flujos que traen partidas (la
 * sincronización normal, el backfill de temporada y la recuperación por
 * compañeros), que se diferencian en QUÉ ids buscan, no en cómo se guardan.
 */
@Injectable()
export class MatchIngestService {
  private readonly logger = new Logger(MatchIngestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly riotApi: RiotApiService,
  ) {}

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
  async resolvePageIds(
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
  async storeNewMatches(
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
  async oldestGameCreation(matchIds: string[]): Promise<Date | null> {
    const oldest = await this.prisma.match.findFirst({
      where: { matchId: { in: matchIds } },
      orderBy: { gameCreation: 'asc' },
      select: { gameCreation: true },
    });

    return oldest?.gameCreation ?? null;
  }

  async fetchMatchWithRetry(
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

  async storeMatch(
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
}
