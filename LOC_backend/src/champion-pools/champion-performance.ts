import type { RosterChampion } from './champion-roster.service';
import { primaryArchetype } from './champion-style';
import type { PoolRoleKey, PoolSlotKey } from './pool-roles';
import type { PoolStatsIndex } from './pool-stats';
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
 * "Keep going or switch?" tip for a champion in one pool slot — distinct from
 * pool-recommendation's 5-champion pool suggestion, which only runs when
 * building/rebuilding the pool. Runs per champion per slot, both on existing
 * pool entries and on outsiders, and only reads the games that slot stands
 * for: Mel filed in Medio is judged on her mid games, not her support ones.
 */
export function evaluateChampionPerformance(
  championKey: string,
  slot: PoolSlotKey,
  roster: RosterChampion[],
  stats: PoolStatsIndex,
  // Champions already in this slot — never offered as the substitute.
  excludeChampionKeys: Set<string>,
): ChampionPerformanceTip {
  const stat = stats.statInSlot(championKey, slot);
  if (!stat || stat.gamesPlayed < MIN_GAMES_FOR_PERFORMANCE_TIP) {
    return { status: 'insufficient_data' };
  }
  if (!isUnderperforming(stat)) {
    return { status: 'good' };
  }

  const rosterByKey = new Map(
    roster.map((champion) => [champion.championKey, champion]),
  );
  // The substitute replaces the champion in the lane those games were played
  // in: the slot's own lane, or for FILL the off-line lane it was taken to.
  const lane =
    stats.laneInSlot(championKey, slot) ??
    rosterByKey.get(championKey)?.role ??
    'MIDDLE';

  // Prefer a proven alternative: someone else the player already performs
  // well on in that same lane, excluding whatever is already in the slot.
  const bestPerformer = stats
    .champions()
    .filter(
      (candidate) =>
        candidate !== championKey && !excludeChampionKeys.has(candidate),
    )
    .map((candidate) => stats.statAtLane(candidate, lane))
    .filter(
      (candidate): candidate is ChampionStatEntry =>
        candidate != null &&
        candidate.gamesPlayed >= MIN_GAMES_FOR_PERFORMANCE_TIP &&
        candidate.winrate > BAD_WINRATE_THRESHOLD,
    )
    .sort((a, b) => b.winrate - a.winrate || b.gamesPlayed - a.gamesPlayed)[0];

  let substituteKey: string | undefined = bestPerformer?.champion;
  if (!substituteKey) {
    // No proven alternative yet — offer an untried champion of that lane
    // with the same playstyle. Only with a style match: picking the first
    // name alphabetically put Alistar forward for any bad support/bot pick
    // (user-reported: "recomendar Alistar para tirador").
    const archetype = primaryArchetype(
      rosterByKey.get(championKey)?.championClass,
    );
    substituteKey = archetype
      ? roster
          .filter(
            (candidate) =>
              candidate.role === lane &&
              candidate.championKey !== championKey &&
              !excludeChampionKeys.has(candidate.championKey) &&
              primaryArchetype(candidate.championClass) === archetype &&
              stats.statAtLane(candidate.championKey, lane) == null,
          )
          .sort((a, b) => a.name.localeCompare(b.name))[0]?.championKey
      : undefined;
  }

  const substitute = substituteKey
    ? {
        championKey: substituteKey,
        name: rosterByKey.get(substituteKey)?.name ?? substituteKey,
        role: lane,
      }
    : null;

  return { status: 'bad', substitute };
}
