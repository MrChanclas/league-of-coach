import type { ChampionPositionTotals } from '../stats/stats.service';
import {
  FILL_SLOT,
  getPoolSlots,
  isPoolRoleKey,
  resolvePoolSlot,
  type PoolRoleKey,
  type PoolRoleProfile,
  type PoolSlotKey,
} from './pool-roles';
import type { ChampionStatEntry } from './pool-types';

function toStatEntry(
  champion: string,
  rows: ChampionPositionTotals[],
): ChampionStatEntry | undefined {
  const gamesPlayed = rows.reduce((sum, row) => sum + row.gamesPlayed, 0);
  if (gamesPlayed === 0) return undefined;
  const sum = (pick: (row: ChampionPositionTotals) => number) =>
    rows.reduce((total, row) => total + pick(row), 0);
  const wins = sum((row) => row.wins);
  const avgKills = sum((row) => row.kills) / gamesPlayed;
  const avgDeaths = sum((row) => row.deaths) / gamesPlayed;
  const avgAssists = sum((row) => row.assists) / gamesPlayed;
  return {
    champion,
    gamesPlayed,
    wins,
    winrate: wins / gamesPlayed,
    // Same formula as StatsService.summarize, so numbers match other tabs.
    avgKda: (avgKills + avgAssists) / Math.max(avgDeaths, 1),
  };
}

/**
 * A champion's season numbers split the way the pool board files them: one
 * figure per main line, plus FILL for every game outside those lines. A
 * champion can sit in several lines (Mel mid and support), and each entry is
 * judged only on the games it actually represents.
 */
export class PoolStatsIndex {
  private readonly rowsByChampion = new Map<string, ChampionPositionTotals[]>();

  constructor(
    rows: ChampionPositionTotals[],
    private readonly roleProfile: PoolRoleProfile,
  ) {
    for (const row of rows) {
      const list = this.rowsByChampion.get(row.champion) ?? [];
      list.push(row);
      this.rowsByChampion.set(row.champion, list);
    }
  }

  /** Every champion with at least one game this season. */
  champions(): string[] {
    return [...this.rowsByChampion.keys()];
  }

  totalGames(): number {
    let total = 0;
    for (const rows of this.rowsByChampion.values()) {
      total += rows.reduce((sum, row) => sum + row.gamesPlayed, 0);
    }
    return total;
  }

  /** Games in exactly this lane (Riot teamPosition). */
  statAtLane(champion: string, lane: PoolRoleKey) {
    return toStatEntry(
      champion,
      (this.rowsByChampion.get(champion) ?? []).filter(
        (row) => row.teamPosition === lane,
      ),
    );
  }

  /** Games that count for this board slot: its own lane, or every off-line game for FILL. */
  statInSlot(champion: string, slot: PoolSlotKey) {
    return toStatEntry(
      champion,
      (this.rowsByChampion.get(champion) ?? []).filter(
        (row) => resolvePoolSlot(row.teamPosition, this.roleProfile) === slot,
      ),
    );
  }

  /**
   * The lane the slot's games were really played in: the slot itself for a
   * main line, the most-played off-line position for FILL. Null when there's
   * no game with a known position to go on.
   */
  laneInSlot(champion: string, slot: PoolSlotKey): PoolRoleKey | null {
    if (slot !== FILL_SLOT) return slot;
    const best = (this.rowsByChampion.get(champion) ?? [])
      .filter(
        (row) =>
          isPoolRoleKey(row.teamPosition) &&
          resolvePoolSlot(row.teamPosition, this.roleProfile) === FILL_SLOT,
      )
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed)[0];
    return best && isPoolRoleKey(best.teamPosition) ? best.teamPosition : null;
  }

  /** Board slots the champion has games in, with the numbers for each. */
  slotsPlayed(champion: string) {
    return getPoolSlots(this.roleProfile)
      .map((slot) => ({ slot, stat: this.statInSlot(champion, slot) }))
      .filter(
        (item): item is { slot: PoolSlotKey; stat: ChampionStatEntry } =>
          item.stat != null,
      );
  }
}
