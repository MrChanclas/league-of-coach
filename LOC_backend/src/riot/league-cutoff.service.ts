import { Injectable, Logger } from '@nestjs/common';
import { RiotApiService } from './riot-api.service';

// Real leaderboard cutoffs move slowly enough (thousands of ranked games
// between meaningful shifts) that a 15-minute cache is plenty fresh, and it
// keeps every "rango" goal read from hammering Riot's API with the same
// leaderboard fetch.
const CACHE_TTL_MS = 15 * 60 * 1000;

type CacheEntry = { cutoffLp: number; fetchedAt: number };

@Injectable()
export class LeagueCutoffService {
  private readonly logger = new Logger(LeagueCutoffService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly riotApi: RiotApiService) {}

  /**
   * The lowest LP currently on the Grandmaster/Challenger leaderboard — the
   * real, live promotion threshold. Master/Grandmaster/Challenger have no
   * fixed LP cutoff (Riot cuts the leaderboard at a dynamic rank, not a
   * score), so this is the only way to know how much LP a goal targeting
   * those tiers actually needs. Returns null (falling back to the previous
   * entry, if any) on any Riot error so callers can degrade to an
   * approximation instead of failing the whole goal.
   */
  async getCutoffLp(
    server: string,
    riotQueue: string,
    tier: 'GRANDMASTER' | 'CHALLENGER',
  ): Promise<number | null> {
    const cacheKey = `${server}:${riotQueue}:${tier}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.cutoffLp;
    }

    try {
      const league =
        tier === 'CHALLENGER'
          ? await this.riotApi.getChallengerLeague(server, riotQueue)
          : await this.riotApi.getGrandmasterLeague(server, riotQueue);

      if (league.entries.length === 0) return cached?.cutoffLp ?? null;

      const cutoffLp = Math.min(
        ...league.entries.map((entry) => entry.leaguePoints),
      );
      this.cache.set(cacheKey, { cutoffLp, fetchedAt: Date.now() });
      return cutoffLp;
    } catch (error) {
      this.logger.warn(
        `No se pudo obtener el corte de ${tier} para ${server}/${riotQueue}: ${error}`,
      );
      return cached?.cutoffLp ?? null;
    }
  }
}
