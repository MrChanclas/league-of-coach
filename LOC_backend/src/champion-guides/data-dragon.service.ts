import { Injectable } from '@nestjs/common';

// Solo se usa si Data Dragon no responde. Con este valor se sella el
// patchVersion de las guías guardadas, así que uno viejo etiqueta mal los
// datos. Mantener igual a FALLBACK_DDRAGON_VERSION en el frontend
// (LOC_frontend/src/lib/riotAssets.ts): son paquetes separados y no pueden
// compartir la constante.
const FALLBACK_VERSION = '16.18.1';

// Un solo lugar para el host de Data Dragon, el CDN público de Riot.
const DDRAGON_HOST = 'https://ddragon.leagueoflegends.com';

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
      this.versionPromise = fetch(`${DDRAGON_HOST}/api/versions.json`)
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
          fetch(`${DDRAGON_HOST}/cdn/${version}/data/en_US/champion.json`),
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
