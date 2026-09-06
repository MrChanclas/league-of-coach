import { BadRequestException, Injectable } from '@nestjs/common';
import { DiscordService } from '../discord/discord.service';

export type RiotAccountDto = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

export type RiotSummonerDto = {
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
};

export type RiotLeagueEntryDto = {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
};

export type RiotLeagueListDto = {
  leagueId: string;
  tier: string;
  name: string;
  queue: string;
  entries: Array<{
    puuid: string;
    leaguePoints: number;
    wins: number;
    losses: number;
  }>;
};

export type RiotMatchParticipantDto = {
  puuid: string;
  championName: string;
  championId: number;
  teamPosition: string;
  teamId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  goldEarned: number;
  visionScore: number;
  totalDamageDealtToChampions: number;
  challenges?: {
    killParticipation?: number;
    teamDamagePercentage?: number;
    soloKills?: number;
    turretTakedowns?: number;
    maxLevelLeadLaneOpponent?: number;
    maxCsAdvantageOnLaneOpponent?: number;
    dragonTakedowns?: number;
    baronTakedowns?: number;
    riftHeraldTakedowns?: number;
    controlWardsPlaced?: number;
  };
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
};

export type RiotMatchDto = {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameMode: string;
    gameVersion: string;
    queueId: number;
    participants: RiotMatchParticipantDto[];
    teams: Array<{
      teamId: number;
      objectives: {
        dragon: { kills: number };
        baron: { kills: number };
        riftHerald: { kills: number };
      };
    }>;
  };
};

const REGIONAL_HOSTS: Record<string, string> = {
  AMERICAS: 'https://americas.api.riotgames.com',
  EUROPE: 'https://europe.api.riotgames.com',
  ASIA: 'https://asia.api.riotgames.com',
  SEA: 'https://sea.api.riotgames.com',
};

const REGION_BY_SERVER: Record<string, keyof typeof REGIONAL_HOSTS> = {
  BR: 'AMERICAS',
  EUN: 'EUROPE',
  EUW: 'EUROPE',
  JP: 'ASIA',
  KR: 'ASIA',
  LA1: 'AMERICAS',
  LA2: 'AMERICAS',
  LAS: 'AMERICAS',
  LATAM: 'AMERICAS',
  NA: 'AMERICAS',
  OCE: 'SEA',
  OC: 'SEA',
  PH: 'SEA',
  SG: 'SEA',
  TH: 'SEA',
  TR: 'EUROPE',
  TW: 'SEA',
  VN: 'SEA',
  RU: 'EUROPE',
  SEA: 'SEA',
};

const PLATFORM_HOSTS: Record<string, string> = {
  BR: 'https://br1.api.riotgames.com',
  EUN: 'https://eun1.api.riotgames.com',
  EUW: 'https://euw1.api.riotgames.com',
  JP: 'https://jp1.api.riotgames.com',
  KR: 'https://kr.api.riotgames.com',
  LA1: 'https://la1.api.riotgames.com',
  LA2: 'https://la2.api.riotgames.com',
  LAS: 'https://la2.api.riotgames.com',
  LATAM: 'https://la1.api.riotgames.com',
  NA: 'https://na1.api.riotgames.com',
  OCE: 'https://oc1.api.riotgames.com',
  OC: 'https://oc1.api.riotgames.com',
  PH: 'https://ph2.api.riotgames.com',
  SG: 'https://sg2.api.riotgames.com',
  TH: 'https://th2.api.riotgames.com',
  TR: 'https://tr1.api.riotgames.com',
  TW: 'https://tw2.api.riotgames.com',
  VN: 'https://vn2.api.riotgames.com',
  RU: 'https://ru.api.riotgames.com',
};

/**
 * Riot's puuids are tied to the API key that resolved them — rotating the
 * key (e.g. swapping a personal key for a registered app's key) leaves
 * every puuid stored before the rotation undecryptable on Riot's side.
 * Callers holding a stored puuid can use this to detect that specific
 * failure and re-resolve the account instead of surfacing a raw 400.
 */
export function isStalePuuidError(error: unknown): boolean {
  if (!(error instanceof BadRequestException)) return false;
  const response = error.getResponse();
  if (typeof response !== 'object' || response === null) return false;
  const riot = (response as Record<string, unknown>).riot;
  return typeof riot === 'string' && riot.includes('Exception decrypting');
}

const MAX_REQUESTS_PER_SECOND = 18;
const MAX_REQUESTS_PER_TWO_MINUTES = 95;

@Injectable()
export class RiotApiService {
  private requestTimestamps: number[] = [];

  constructor(private readonly discord: DiscordService) {}

  private getApiKey(): string {
    const apiKey = process.env.RIOT_API_KEY?.trim();

    if (!apiKey || this.isPlaceholderValue(apiKey)) {
      this.discord.notifyIssueThrottled(
        'riot-missing-api-key',
        '⚠️ RIOT_API_KEY no está configurada o es un placeholder — ninguna llamada a Riot va a funcionar.',
      );
      throw new BadRequestException(
        'Falta una RIOT_API_KEY válida en el entorno. Copia tu API key real de Riot Developer y reemplaza el valor placeholder.',
      );
    }

    return apiKey;
  }

  private isPlaceholderValue(value: string) {
    const normalized = value.trim().toLowerCase();
    return (
      normalized.length === 0 ||
      normalized.includes('tu_riot') ||
      normalized.includes('your_riot') ||
      normalized.includes('placeholder') ||
      normalized.includes('example') ||
      normalized.includes('demo')
    );
  }

  getRegionalHost(server: string) {
    const normalized = server.trim().toUpperCase();
    const region = REGION_BY_SERVER[normalized] ?? 'AMERICAS';
    return REGIONAL_HOSTS[region];
  }

  getPlatformHost(server: string) {
    const normalized = server.trim().toUpperCase();
    return PLATFORM_HOSTS[normalized] ?? PLATFORM_HOSTS.LAS;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < 120_000,
    );

    const withinLastSecond = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < 1_000,
    ).length;
    const withinLastTwoMinutes = this.requestTimestamps.length;

    let waitMs = 0;
    if (withinLastSecond >= MAX_REQUESTS_PER_SECOND) {
      waitMs = Math.max(waitMs, 1_000);
    }
    if (withinLastTwoMinutes >= MAX_REQUESTS_PER_TWO_MINUTES) {
      const oldest = this.requestTimestamps[0];
      waitMs = Math.max(waitMs, 120_000 - (now - oldest));
    }

    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.throttle();
    }

    this.requestTimestamps.push(now);
  }

  private async request<T>(url: string): Promise<T> {
    await this.throttle();

    const response = await fetch(url, {
      headers: {
        'X-Riot-Token': this.getApiKey(),
      },
    });

    if (!response.ok) {
      const payload = await response.text();

      // 404 is routine (a summoner search that doesn't match anything) and
      // not worth a Discord ping; everything else signals a real problem
      // with the Riot integration itself (bad/expired key, rate limit, Riot
      // outage).
      if (response.status !== 404) {
        this.discord.notifyIssueThrottled(
          `riot-${response.status}`,
          `⚠️ Riot API respondió **${response.status}** en \`${url}\`: ${payload}`,
        );
      }

      throw new BadRequestException({
        message: 'No se pudo completar la solicitud a Riot.',
        status: response.status,
        riot: payload,
      });
    }

    const data: unknown = await response.json();
    return data as T;
  }

  async getAccountByRiotId(
    server: string,
    gameName: string,
    tagLine: string,
  ): Promise<RiotAccountDto> {
    const host = this.getRegionalHost(server);
    return this.request<RiotAccountDto>(
      `${host}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    );
  }

  async getAccountByPuuid(
    server: string,
    puuid: string,
  ): Promise<RiotAccountDto> {
    const host = this.getRegionalHost(server);
    return this.request<RiotAccountDto>(
      `${host}/riot/account/v1/accounts/by-puuid/${encodeURIComponent(puuid)}`,
    );
  }

  async getSummonerByPuuid(
    server: string,
    puuid: string,
  ): Promise<RiotSummonerDto> {
    const host = this.getPlatformHost(server);
    return this.request<RiotSummonerDto>(
      `${host}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`,
    );
  }

  async getLeagueEntriesByPuuid(
    server: string,
    puuid: string,
  ): Promise<RiotLeagueEntryDto[]> {
    const host = this.getPlatformHost(server);
    return this.request<RiotLeagueEntryDto[]>(
      `${host}/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`,
    );
  }

  /**
   * Grandmaster and Challenger have no fixed LP threshold — Riot cuts the
   * leaderboard at a dynamic rank (e.g. top 300), not a score — so the only
   * way to know the real, current promotion threshold is the lowest LP
   * actually on this leaderboard right now.
   */
  async getGrandmasterLeague(
    server: string,
    riotQueue: string,
  ): Promise<RiotLeagueListDto> {
    const host = this.getPlatformHost(server);
    return this.request<RiotLeagueListDto>(
      `${host}/lol/league/v4/grandmasterleagues/by-queue/${encodeURIComponent(riotQueue)}`,
    );
  }

  async getChallengerLeague(
    server: string,
    riotQueue: string,
  ): Promise<RiotLeagueListDto> {
    const host = this.getPlatformHost(server);
    return this.request<RiotLeagueListDto>(
      `${host}/lol/league/v4/challengerleagues/by-queue/${encodeURIComponent(riotQueue)}`,
    );
  }

  async getMatchIdsByPuuid(
    server: string,
    puuid: string,
    options: {
      start?: number;
      count?: number;
      queue?: number;
      type?: string;
    } = {},
  ): Promise<string[]> {
    const host = this.getRegionalHost(server);
    const params = new URLSearchParams();
    params.set('start', String(options.start ?? 0));
    params.set('count', String(Math.min(options.count ?? 10, 20)));
    if (options.queue) {
      params.set('queue', String(options.queue));
    }
    if (options.type) {
      params.set('type', options.type);
    }

    return this.request<string[]>(
      `${host}/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?${params.toString()}`,
    );
  }

  async getMatchById(server: string, matchId: string): Promise<RiotMatchDto> {
    const host = this.getRegionalHost(server);
    return this.request<RiotMatchDto>(
      `${host}/lol/match/v5/matches/${encodeURIComponent(matchId)}`,
    );
  }
}
