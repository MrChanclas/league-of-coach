import { Injectable, Logger } from '@nestjs/common';

const DDRAGON_VERSIONS_URL =
  'https://ddragon.leagueoflegends.com/api/versions.json';
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

type DDragonChampionEntry = {
  key: string;
  id: string;
  name: string;
};

@Injectable()
export class ChampionDataService {
  private readonly logger = new Logger(ChampionDataService.name);
  private championsById = new Map<number, string>();
  private lastLoadedAt = 0;

  async getChampionName(championId: number): Promise<string | undefined> {
    await this.ensureLoaded();
    return this.championsById.get(championId);
  }

  private async ensureLoaded() {
    const isStale = Date.now() - this.lastLoadedAt > REFRESH_INTERVAL_MS;
    if (this.championsById.size > 0 && !isStale) {
      return;
    }

    try {
      const versionsResponse = await fetch(DDRAGON_VERSIONS_URL);
      const versions = (await versionsResponse.json()) as string[];
      const latestVersion = versions[0];

      const championsResponse = await fetch(
        `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`,
      );
      const championsPayload = (await championsResponse.json()) as {
        data: Record<string, DDragonChampionEntry>;
      };

      const nextMap = new Map<number, string>();
      for (const champion of Object.values(championsPayload.data)) {
        nextMap.set(Number(champion.key), champion.name);
      }

      this.championsById = nextMap;
      this.lastLoadedAt = Date.now();
    } catch (error) {
      this.logger.warn(
        `No se pudo actualizar el catálogo de campeones de Data Dragon: ${error}`,
      );
    }
  }
}
