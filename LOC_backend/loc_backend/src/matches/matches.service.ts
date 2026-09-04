import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RankSnapshotsService } from '../rank-snapshots/rank-snapshots.service';
import { RiotApiService, RiotMatchDto } from '../riot/riot-api.service';

const MAX_NEW_MATCHES_PER_SYNC = 10;

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly riotApi: RiotApiService,
    private readonly rankSnapshots: RankSnapshotsService,
  ) {}

  async syncAccount(accountId: string, count = 10) {
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

    const matchIds = await this.riotApi.getMatchIdsByPuuid(
      account.server,
      account.puuid,
      {
        count: Math.min(count, 20),
      },
    );

    const existing = await this.prisma.match.findMany({
      where: { matchId: { in: matchIds } },
      select: { matchId: true },
    });
    const existingIds = new Set(existing.map((match) => match.matchId));

    const newIds = matchIds
      .filter((id) => !existingIds.has(id))
      .slice(0, MAX_NEW_MATCHES_PER_SYNC);

    let synced = 0;
    for (const matchId of newIds) {
      const matchDto = await this.riotApi.getMatchById(account.server, matchId);
      await this.storeMatch(
        account.id,
        account.server,
        account.puuid,
        matchDto,
      );
      synced += 1;
    }

    await this.refreshRankSnapshot(account.id, account.server, account.puuid);

    return {
      synced,
      skipped: matchIds.length - newIds.length,
      totalFetched: matchIds.length,
    };
  }

  private async refreshRankSnapshot(
    accountId: string,
    server: string,
    puuid: string,
  ) {
    const entries = await this.riotApi
      .getLeagueEntriesByPuuid(server, puuid)
      .catch(() => []);

    if (entries.length === 0) return;

    const soloEntry = entries.find(
      (entry) => entry.queueType === 'RANKED_SOLO_5x5',
    );
    const flexEntry = entries.find(
      (entry) => entry.queueType === 'RANKED_FLEX_SR',
    );

    await this.prisma.lolAccount.update({
      where: { id: accountId },
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

    await this.rankSnapshots.recordFromLeagueEntries(accountId, entries);
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

    const enrichedItems = items.map((item) => ({
      ...item,
      damagePercentile: this.computeDamagePercentile(
        item.damageDealt,
        damagesByMatch.get(item.matchId) ?? [item.damageDealt],
      ),
    }));

    return { items: enrichedItems, total, page, pageSize };
  }

  private computeDamagePercentile(value: number, all: number[]) {
    if (all.length <= 1) return 100;
    const lessOrEqual = all.filter((entry) => entry <= value).length;
    return Math.round(((lessOrEqual - 1) / (all.length - 1)) * 100);
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
