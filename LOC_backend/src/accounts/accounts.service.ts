import { ConflictException, Injectable } from '@nestjs/common';
import { DiscordService } from '../discord/discord.service';
import { PrismaService } from '../prisma/prisma.service';
import { RankSnapshotsService } from '../rank-snapshots/rank-snapshots.service';
import { RiotApiService, RiotLeagueEntryDto } from '../riot/riot-api.service';

type AccountInput = {
  summoner: string;
  tag: string;
  server: string;
  userId: string;
};

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly riotApi: RiotApiService,
    private readonly rankSnapshots: RankSnapshotsService,
    private readonly discord: DiscordService,
  ) {}

  /** Links the Riot account to the user, or refreshes it if it's already theirs. */
  async create(input: AccountInput) {
    const resolved = await this.populateFromRiot(input);

    const existing = await this.prisma.lolAccount.findUnique({
      where: { puuid: resolved.puuid },
    });
    if (existing && existing.userId !== resolved.userId) {
      throw new ConflictException(
        existing.verifiedAt
          ? {
              code: 'ACCOUNT_VERIFIED_ELSEWHERE',
              message: 'Esta cuenta de Riot ya fue verificada por otro perfil.',
            }
          : {
              code: 'ACCOUNT_CLAIMABLE',
              message:
                'Esta cuenta de Riot está vinculada a otro perfil. Si es tuya, verifícala para reclamarla.',
            },
      );
    }

    const data = {
      summoner: resolved.summoner,
      tag: resolved.tag,
      server: resolved.server,
      puuid: resolved.puuid,
      profileIconId: resolved.profileIconId,
      summonerLevel: resolved.summonerLevel,
      soloTier: resolved.soloTier,
      soloDivision: resolved.soloDivision,
      soloLp: resolved.soloLp,
      soloWins: resolved.soloWins,
      soloLosses: resolved.soloLosses,
      flexTier: resolved.flexTier,
      flexDivision: resolved.flexDivision,
      flexLp: resolved.flexLp,
      flexWins: resolved.flexWins,
      flexLosses: resolved.flexLosses,
      userId: resolved.userId,
    };

    if (existing) {
      const account = await this.prisma.lolAccount.update({
        where: { id: existing.id },
        data,
      });

      await this.rankSnapshots.recordFromLeagueEntries(
        account.id,
        resolved.leagueEntries,
      );

      return {
        found: true,
        created: false,
        account,
        message: 'Cuenta actualizada con los datos más recientes de Riot.',
      };
    }

    const account = await this.prisma.lolAccount.create({ data });

    await this.rankSnapshots.recordFromLeagueEntries(
      account.id,
      resolved.leagueEntries,
    );

    this.discord.notifySession(
      `🔗 Cuenta vinculada: **${account.summoner}#${account.tag}** (${account.server})`,
    );

    return {
      found: true,
      created: true,
      account,
      message: 'Cuenta detectada y vinculada correctamente.',
    };
  }

  async listByUser(userId: string) {
    return this.prisma.lolAccount.findMany({
      where: { userId },
      include: {
        learnings: true,
        goals: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.lolAccount.findUnique({
      where: { id },
      include: {
        learnings: true,
        goals: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.lolAccount.delete({ where: { id } });
  }

  private async populateFromRiot(input: AccountInput) {
    const riotAccount = await this.riotApi.getAccountByRiotId(
      input.server,
      input.summoner,
      input.tag,
    );

    const entries = await this.riotApi
      .getLeagueEntriesByPuuid(input.server, riotAccount.puuid)
      .catch((): RiotLeagueEntryDto[] => []);

    const summoner = await this.riotApi
      .getSummonerByPuuid(input.server, riotAccount.puuid)
      .catch(() => null);

    const soloEntry = entries.find(
      (entry) => entry.queueType === 'RANKED_SOLO_5x5',
    );
    const flexEntry = entries.find(
      (entry) => entry.queueType === 'RANKED_FLEX_SR',
    );

    return {
      ...input,
      summoner: riotAccount.gameName ?? input.summoner,
      tag: riotAccount.tagLine ?? input.tag,
      puuid: riotAccount.puuid,
      profileIconId: summoner?.profileIconId ?? 0,
      summonerLevel: summoner?.summonerLevel ?? 0,
      soloTier: soloEntry?.tier ?? 'Unranked',
      soloDivision: soloEntry?.rank ?? 'Unranked',
      soloLp: soloEntry?.leaguePoints ?? 0,
      soloWins: soloEntry?.wins ?? 0,
      soloLosses: soloEntry?.losses ?? 0,
      flexTier: flexEntry?.tier ?? 'Unranked',
      flexDivision: flexEntry?.rank ?? 'Unranked',
      flexLp: flexEntry?.leaguePoints ?? 0,
      flexWins: flexEntry?.wins ?? 0,
      flexLosses: flexEntry?.losses ?? 0,
      leagueEntries: entries,
    };
  }
}
