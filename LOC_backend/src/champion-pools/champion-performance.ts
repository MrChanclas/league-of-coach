import type { RosterChampion } from './champion-roster.service';
import {
  isPoolRoleKey,
  type PoolRoleKey,
  type PoolSlotKey,
} from './pool-roles';
import type { ChampionStatEntry } from './pool-types';

// Same "not enough games to mean anything" bar the rest of the pool uses
// (pool-recommendation's MIN_GAMES_FOR_PERFORMANCE_PICK, pool-health's
// MIN_GAMES_FOR_SIGNAL) — kept as its own constant since this evaluates a
// single already-in-use champion, not a recommendation candidate.
export const MIN_GAMES_FOR_PERFORMANCE_TIP = 3;

// User spec: "Bajo o igual al 49% de wr se considera mal caso contrario, le
// va bien" — at or below this winrate the coach calls it "going badly".
export const BAD_WINRATE_THRESHOLD = 0.49;

export type ChampionPerformanceTip =
  | { status: 'insufficient_data' }
  | { status: 'good' }
  | {
      status: 'bad';
      substitute: {
        championKey: string;
        name: string;
        role: PoolRoleKey;
      } | null;
    };

/**
 * The "Necesitas mejorar" verdict on its own, without the substitute search —
 * Aprendizaje uses it to attach a guide to every pool champion Pool Champ
 * flags, so both tabs have to share this exact rule.
 */
export function isUnderperforming(
  stat: Pick<ChampionStatEntry, 'gamesPlayed' | 'winrate'> | undefined,
): boolean {
  return (
    stat != null &&
    stat.gamesPlayed >= MIN_GAMES_FOR_PERFORMANCE_TIP &&
    stat.winrate <= BAD_WINRATE_THRESHOLD
  );
}

/**
 * "Keep going or switch?" tip for a champion the player is actually using —
 * distinct from pool-recommendation's 5-champion pool suggestion, which only
 * runs when building/rebuilding the pool. This runs per champion, both while
 * building the pool (on outsiders, before adding one) and afterward (on
 * existing pool entries), so it needs its own read of the same stats/roster
 * rather than reusing recommendation picks.
 */
export function evaluateChampionPerformance(
  championKey: string,
  role: PoolSlotKey,
  roster: RosterChampion[],
  championStats: ChampionStatEntry[],
  primaryRoleByChampion: Map<string, string>,
  excludeChampionKeys: Set<string>,
): ChampionPerformanceTip {
  const statsByChampion = new Map(
    championStats.map((stat) => [stat.champion, stat]),
  );
  const stat = statsByChampion.get(championKey);
  const gamesPlayed = stat?.gamesPlayed ?? 0;

  if (gamesPlayed < MIN_GAMES_FOR_PERFORMANCE_TIP || !stat) {
    return { status: 'insufficient_data' };
  }
  if (!isUnderperforming(stat)) {
    return { status: 'good' };
  }

  const rosterByKey = new Map(
    roster.map((champion) => [champion.championKey, champion]),
  );
  const roleFor = (key: string): PoolRoleKey => {
    const playedRole = primaryRoleByChampion.get(key);
    if (playedRole && isPoolRoleKey(playedRole)) return playedRole;
    return rosterByKey.get(key)?.role ?? 'MIDDLE';
  };

  // The substitute has to replace the champion in the lane the player
  // actually takes it to, not in whichever pool slot it was filed under:
  // the pool editor drops a clicked champion into the active slot, so a Nilah
  // played only at bot can sit under Superior and would otherwise be told to
  // make way for the account's best top laner (user-reported: Nilah -> Garen).
  // A FILL entry has no lane of its own, so it falls back to the champion's
  // roster role instead.
  const playedRole = primaryRoleByChampion.get(championKey);
  const laneRole: PoolRoleKey =
    playedRole && isPoolRoleKey(playedRole)
      ? playedRole
      : isPoolRoleKey(role)
        ? role
        : (rosterByKey.get(championKey)?.role ?? 'MIDDLE');

  // Prefer a proven alternative: someone else in the same role the player
  // already performs well on, excluding whatever is already in the pool.
  const bestPerformer = championStats
    .filter(
      (candidate) =>
        candidate.champion !== championKey &&
        !excludeChampionKeys.has(candidate.champion) &&
        candidate.gamesPlayed >= MIN_GAMES_FOR_PERFORMANCE_TIP &&
        candidate.winrate > BAD_WINRATE_THRESHOLD &&
        roleFor(candidate.champion) === laneRole,
    )
    .sort((a, b) => b.winrate - a.winrate || b.gamesPlayed - a.gamesPlayed)[0];

  let substituteKey = bestPerformer?.champion;
  if (!substituteKey) {
    // No proven alternative yet — offer an untried roster champion in the
    // same role instead, same fallback idea as pool-recommendation's
    // CUBRE_HUECO gap pick.
    substituteKey = roster
      .filter(
        (candidate) =>
          candidate.role === laneRole &&
          candidate.championKey !== championKey &&
          !excludeChampionKeys.has(candidate.championKey) &&
          (statsByChampion.get(candidate.championKey)?.gamesPlayed ?? 0) === 0,
      )
      .sort((a, b) => a.name.localeCompare(b.name))[0]?.championKey;
  }

  const substitute = substituteKey
    ? {
        championKey: substituteKey,
        name: rosterByKey.get(substituteKey)?.name ?? substituteKey,
        role: laneRole,
      }
    : null;

  return { status: 'bad', substitute };
}
