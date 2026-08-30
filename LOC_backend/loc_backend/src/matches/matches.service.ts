import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiotApiService, RiotMatchDto } from '../riot/riot-api.service';

const MAX_NEW_MATCHES_PER_SYNC = 10;

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly riotApi: RiotApiService,
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

    return {
      synced,
      skipped: matchIds.length - newIds.length,
      totalFetched: matchIds.length,
    };
  }

  private async storeMatch(
    accountId: string,
    server: string,
    puuid: string,
    matchDto: RiotMatchDto,
  ) {
    const participant = matchDto.info.participants.find(
      (entry) => entry.puuid === puuid,
    );

    if (!participant) {
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

    const csTotal =
      participant.totalMinionsKilled + participant.neutralMinionsKilled;

    await this.prisma.matchParticipant.create({
      data: {
        matchId: match.id,
        accountId,
        puuid,
        champion: participant.championName,
        championId: participant.championId,
        teamPosition: participant.teamPosition,
        win: participant.win,
        kills: participant.kills,
        deaths: participant.deaths,
        assists: participant.assists,
        csTotal,
        goldEarned: participant.goldEarned,
        teamId: participant.teamId,
      },
    });

    await this.upsertChampionLearning(
      accountId,
      participant,
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

    return { items, total, page, pageSize };
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
