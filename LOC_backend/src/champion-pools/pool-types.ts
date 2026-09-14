import type { ChampionPerformanceTip } from './champion-performance';
import type { PoolAddedBy, PoolEntryState, PoolSlotKey } from './pool-roles';

export type EnrichedPoolEntry = {
  championKey: string;
  name: string;
  role: PoolSlotKey;
  state: PoolEntryState;
  note: string | null;
  addedBy: PoolAddedBy;
  position: number;
  gamesPlayed: number;
  winrate: number;
  avgKda: number;
  performance: ChampionPerformanceTip;
};

// A champion's games in one board slot that the pool doesn't cover yet — the
// same champion can show up once per slot (in Medio but played at Soporte).
export type PoolOutsider = {
  championKey: string;
  name: string;
  role: PoolSlotKey;
  gamesPlayed: number;
  winrate: number;
  performance: ChampionPerformanceTip;
};

export type ChampionStatEntry = {
  champion: string;
  gamesPlayed: number;
  wins: number;
  winrate: number;
  avgKda: number;
};
