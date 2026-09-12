import { Injectable } from '@nestjs/common';
import { DataDragonService } from '../champion-guides/data-dragon.service';
import { MANUAL_GUIDES } from '../champion-guides/data/manual-guides';
import { poolRoleFromGuideRole, type PoolRoleKey } from './pool-roles';

export type RosterChampion = {
  championKey: string;
  name: string;
  role: PoolRoleKey;
  championClass: string | null;
};

/**
 * The full champion universe for the Pool Champ grid: Data Dragon supplies
 * id + display name for every champion currently in the game, and the
 * hand-authored champion-guides data (already covering the full roster —
 * see champion-guides/data/manual-guides) supplies a role and class for
 * each. A champion released after that file was last updated falls back to
 * MIDDLE/no class rather than failing the whole roster.
 */
@Injectable()
export class ChampionRosterService {
  constructor(private readonly dataDragon: DataDragonService) {}

  private rosterPromise: Promise<RosterChampion[]> | null = null;

  async getRoster(): Promise<RosterChampion[]> {
    if (!this.rosterPromise) {
      this.rosterPromise = this.buildRoster();
    }
    return this.rosterPromise;
  }

  private async buildRoster(): Promise<RosterChampion[]> {
    const ddragonRoster = await this.dataDragon.getChampionRoster();
    const guideByKey = new Map(
      MANUAL_GUIDES.map((guide) => [guide.championKey, guide.content]),
    );

    return ddragonRoster.map((champion) => {
      const guide = guideByKey.get(champion.championKey);
      return {
        championKey: champion.championKey,
        name: champion.name,
        role: guide ? poolRoleFromGuideRole(guide.role) : 'MIDDLE',
        championClass: guide?.championClass ?? null,
      };
    });
  }
}
