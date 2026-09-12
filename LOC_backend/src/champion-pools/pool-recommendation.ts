import type { RosterChampion } from './champion-roster.service';
import { primaryArchetype } from './champion-style';
import {
  isPoolRoleKey,
  POOL_ROLE_KEYS,
  POOL_ROLE_LABELS,
  type PoolRoleKey,
} from './pool-roles';
import type { ChampionStatEntry } from './pool-types';

// Below this many total games on the account, any recommendation would be
// guessing — see handoff_loc/07-pool-champ.md: "si no hay datos suficientes
// para una recomendación honesta, decilo y ofrecé solo el camino manual."
const MIN_TOTAL_GAMES_FOR_RECOMMENDATION = 10;
// A champion needs at least this many games to count as "real performance"
// for the YA TE RINDE slot — one lucky game isn't a signal.
const MIN_GAMES_FOR_PERFORMANCE_PICK = 3;

export type RecommendationLabel = 'YA_TE_RINDE' | 'TU_ESTILO' | 'CUBRE_HUECO';

export type RecommendationEntry = {
  championKey: string;
  name: string;
  role: PoolRoleKey;
  state: 'main' | 'testing';
  label: RecommendationLabel;
  reason: string;
};

export type PoolRecommendation =
  | { available: true; entries: RecommendationEntry[] }
  | { available: false; reason: string };

/**
 * The coach's 5-champion pool suggestion: 2 champions the player already
 * performs well on ("YA TE RINDE"), 2 that share a style/class with what
 * they already play ("TU ESTILO"), and 1 that fills a position with nothing
 * in the pool ("CUBRE HUECO") — see handoff_loc/07-pool-champ.md. This is a
 * pure function so it can be unit-tested without a database.
 */
export function computeRecommendation(
  roster: RosterChampion[],
  championStats: ChampionStatEntry[],
  primaryRoleByChampion: Map<string, string>,
  existingPoolChampionKeys: Set<string>,
): PoolRecommendation {
  const totalGames = championStats.reduce(
    (sum, entry) => sum + entry.gamesPlayed,
    0,
  );
  if (totalGames < MIN_TOTAL_GAMES_FOR_RECOMMENDATION) {
    return {
      available: false,
      reason:
        'Todavía no hay partidas suficientes para una recomendación honesta. Armá tu pool a mano por ahora.',
    };
  }

  const rosterByKey = new Map(
    roster.map((champion) => [champion.championKey, champion]),
  );
  const statsByChampion = new Map(
    championStats.map((stat) => [stat.champion, stat]),
  );
  const selected = new Set<string>(existingPoolChampionKeys);
  const picks: RecommendationEntry[] = [];

  const roleFor = (championKey: string): PoolRoleKey => {
    const playedRole = primaryRoleByChampion.get(championKey);
    if (playedRole && isPoolRoleKey(playedRole)) return playedRole;
    return rosterByKey.get(championKey)?.role ?? 'MIDDLE';
  };

  // 1) YA TE RINDE — real performance, best winrate first among champions
  // with enough games to mean something.
  const performanceCandidates = championStats
    .filter(
      (stat) =>
        stat.gamesPlayed >= MIN_GAMES_FOR_PERFORMANCE_PICK &&
        !selected.has(stat.champion),
    )
    .sort((a, b) => b.winrate - a.winrate || b.gamesPlayed - a.gamesPlayed);

  for (const candidate of performanceCandidates) {
    if (picks.filter((pick) => pick.label === 'YA_TE_RINDE').length >= 2) break;
    picks.push({
      championKey: candidate.champion,
      name: rosterByKey.get(candidate.champion)?.name ?? candidate.champion,
      role: roleFor(candidate.champion),
      state: 'main',
      label: 'YA_TE_RINDE',
      reason: `Tu mejor rendimiento del split: ${Math.round(candidate.winrate * 100)}% en ${candidate.gamesPlayed} partidas`,
    });
    selected.add(candidate.champion);
  }

  // 2) TU ESTILO — champions sharing the archetype of what the player
  // already plays the most, preferring ones they haven't tried much yet so
  // it's a genuine suggestion rather than restating YA TE RINDE.
  const mostPlayed = [...championStats]
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
    .slice(0, 5);
  const archetypeWeights = new Map<string, number>();
  for (const stat of mostPlayed) {
    const archetype = primaryArchetype(
      rosterByKey.get(stat.champion)?.championClass,
    );
    if (!archetype) continue;
    archetypeWeights.set(
      archetype,
      (archetypeWeights.get(archetype) ?? 0) + stat.gamesPlayed,
    );
  }
  const topArchetype =
    [...archetypeWeights.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  if (topArchetype) {
    const styleCandidates = roster
      .filter((champion) => !selected.has(champion.championKey))
      .filter(
        (champion) => primaryArchetype(champion.championClass) === topArchetype,
      )
      .sort((a, b) => {
        const gamesA = statsByChampion.get(a.championKey)?.gamesPlayed ?? 0;
        const gamesB = statsByChampion.get(b.championKey)?.gamesPlayed ?? 0;
        return gamesA - gamesB || a.name.localeCompare(b.name);
      });

    for (const candidate of styleCandidates) {
      if (picks.filter((pick) => pick.label === 'TU_ESTILO').length >= 2) break;
      picks.push({
        championKey: candidate.championKey,
        name: candidate.name,
        role: roleFor(candidate.championKey),
        state: 'testing',
        label: 'TU_ESTILO',
        reason: `Comparte estilo con lo que ya jugás (${candidate.championClass ?? topArchetype})`,
      });
      selected.add(candidate.championKey);
    }
  }

  // 3) CUBRE HUECO — one champion for whichever position has nothing picked
  // yet, preferring one the player has at least touched.
  const coveredRoles = new Set(picks.map((pick) => pick.role));
  const missingRole = POOL_ROLE_KEYS.find((role) => !coveredRoles.has(role));
  if (missingRole) {
    const gapCandidate = roster
      .filter(
        (champion) =>
          !selected.has(champion.championKey) && champion.role === missingRole,
      )
      .sort((a, b) => {
        const gamesA = statsByChampion.get(a.championKey)?.gamesPlayed ?? 0;
        const gamesB = statsByChampion.get(b.championKey)?.gamesPlayed ?? 0;
        return gamesB - gamesA || a.name.localeCompare(b.name);
      })[0];

    if (gapCandidate) {
      picks.push({
        championKey: gapCandidate.championKey,
        name: gapCandidate.name,
        role: missingRole,
        state: 'testing',
        label: 'CUBRE_HUECO',
        reason: `Te falta ${POOL_ROLE_LABELS[missingRole]} en el pool`,
      });
      selected.add(gapCandidate.championKey);
    }
  }

  if (picks.length === 0) {
    return {
      available: false,
      reason:
        'No encontramos una recomendación honesta con tus datos actuales. Armá tu pool a mano.',
    };
  }

  return { available: true, entries: picks };
}
