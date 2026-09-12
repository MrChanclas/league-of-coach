import { Injectable } from '@nestjs/common';

const FALLBACK_VERSION = '15.19.1';

export type DDragonChampion = {
  championKey: string; // Data Dragon id, e.g. "MonkeyKing" — matches Riot's championName field
  name: string; // display name, e.g. "Wukong"
};

/** Thin, cached client for Data Dragon's current patch version and champion roster — no credentials needed. */
@Injectable()
export class DataDragonService {
  private versionPromise: Promise<string> | null = null;
  private rosterPromise: Promise<DDragonChampion[]> | null = null;

  async getVersion(): Promise<string> {
    if (!this.versionPromise) {
      this.versionPromise = fetch(
        'https://ddragon.leagueoflegends.com/api/versions.json',
      )
        .then((res) => res.json() as Promise<string[]>)
        .then((versions) => versions[0] ?? FALLBACK_VERSION)
        .catch(() => FALLBACK_VERSION);
    }
    return this.versionPromise;
  }

  /** Full champion roster (id + display name) for the current patch — used to build the Pool Champ grid. */
  async getChampionRoster(): Promise<DDragonChampion[]> {
    if (!this.rosterPromise) {
      this.rosterPromise = this.getVersion()
        .then((version) =>
          fetch(
            `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`,
          ),
        )
        .then(
          (res) =>
            res.json() as Promise<{
              data: Record<string, { id: string; name: string }>;
            }>,
        )
        .then((payload) =>
          Object.values(payload.data)
            .map((champion) => ({
              championKey: champion.id,
              name: champion.name,
            }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        )
        .catch(() => []);
    }
    return this.rosterPromise;
  }
}
