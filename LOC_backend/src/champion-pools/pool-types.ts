import type { ChampionPerformanceTip } from './champion-performance';
import type {
  PoolAddedBy,
  PoolEntryState,
  PoolRoleKey,
  PoolSlotKey,
} from './pool-roles';

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

export type PoolOutsider = {
  championKey: string;
  name: string;
  role: PoolRoleKey;
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
