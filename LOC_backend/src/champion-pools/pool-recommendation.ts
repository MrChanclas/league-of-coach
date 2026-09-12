import type { RosterChampion } from './champion-roster.service';
import { primaryArchetype } from './champion-style';
import {
  isPoolRoleKey,
  MIN_CHAMPIONS_PER_ROLE,
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
// How many of the player's most-played roles the coach tries to fill all the
// way to MIN_CHAMPIONS_PER_ROLE — see user-reported bug: a mid main was
// getting a scattershot of 1-2 picks spread across roles they barely play,
// instead of enough picks in their actual main line(s) to reach a valid
// pool there. Two, not one, since plenty of accounts genuinely split their
// games across two roles (autofill, or a real dual-main).
const MAIN_ROLES_COUNT = 2;

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
 * The coach's pool suggestion. Finds the player's 1-2 most-played roles from
 * their actual games and fills each one up to MIN_CHAMPIONS_PER_ROLE:
 * proven performers first ("YA TE RINDE"), then champions sharing a
 * playstyle with what's already played in that same role ("TU ESTILO"),
 * then — only if a role still isn't full — any untried roster champion of
 * that role as a last resort, so the role reaches a valid pool on its own.
 * A completely untouched role outside those main ones also gets one starter
 * pick ("CUBRE HUECO") so nothing is left at zero. Pure function so it can
 * be unit-tested without a database — see handoff_loc/07-pool-champ.md.
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
        'Todavía no hay partidas suficientes para una recomendación honesta. Arma tu pool a mano por ahora.',
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

  const countInRole = (role: PoolRoleKey) =>
    picks.filter((pick) => pick.role === role).length;

  // 1) Which role(s) does the player actually main? Every champion's games
  // count toward whichever role that champion is actually played in for
  // this account (roleFor), not that champion's "official" role.
  const gamesByRole = new Map<PoolRoleKey, number>();
  for (const stat of championStats) {
    const role = roleFor(stat.champion);
    gamesByRole.set(role, (gamesByRole.get(role) ?? 0) + stat.gamesPlayed);
  }
  const mainRoles = [...gamesByRole.entries()]
    .filter(([, games]) => games > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAIN_ROLES_COUNT)
    .map(([role]) => role);

  // 2) Fill each main role up to MIN_CHAMPIONS_PER_ROLE.
  for (const role of mainRoles) {
    // 2a) YA TE RINDE — real performance in this exact role, best winrate
    // first among champions with enough games to mean something.
    const performers = championStats
      .filter(
        (stat) =>
          !selected.has(stat.champion) &&
          stat.gamesPlayed >= MIN_GAMES_FOR_PERFORMANCE_PICK &&
          roleFor(stat.champion) === role,
      )
      .sort((a, b) => b.winrate - a.winrate || b.gamesPlayed - a.gamesPlayed);

    for (const candidate of performers) {
      if (countInRole(role) >= MIN_CHAMPIONS_PER_ROLE) break;
      picks.push({
        championKey: candidate.champion,
        name: rosterByKey.get(candidate.champion)?.name ?? candidate.champion,
        role,
        state: 'main',
        label: 'YA_TE_RINDE',
        reason: `Tu mejor rendimiento del split en ${POOL_ROLE_LABELS[role]}: ${Math.round(candidate.winrate * 100)}% en ${candidate.gamesPlayed} partidas`,
      });
      selected.add(candidate.champion);
    }

    // 2b) TU ESTILO — if the role isn't full yet, champions sharing the
    // archetype of what's already played within this same role, preferring
    // ones untried so it's a genuine suggestion rather than restating 2a.
    if (countInRole(role) < MIN_CHAMPIONS_PER_ROLE) {
      const roleArchetypeWeights = new Map<string, number>();
      for (const stat of championStats) {
        if (roleFor(stat.champion) !== role) continue;
        const archetype = primaryArchetype(
          rosterByKey.get(stat.champion)?.championClass,
        );
        if (!archetype) continue;
        roleArchetypeWeights.set(
          archetype,
          (roleArchetypeWeights.get(archetype) ?? 0) + stat.gamesPlayed,
        );
      }
      const topArchetype =
        [...roleArchetypeWeights.entries()].sort((a, b) => b[1] - a[1])[0]
          ?.[0] ?? null;

      if (topArchetype) {
        const styleCandidates = roster
          .filter(
            (champion) =>
              champion.role === role &&
              !selected.has(champion.championKey) &&
              primaryArchetype(champion.championClass) === topArchetype,
          )
          .sort((a, b) => {
            const gamesA = statsByChampion.get(a.championKey)?.gamesPlayed ?? 0;
            const gamesB = statsByChampion.get(b.championKey)?.gamesPlayed ?? 0;
            return gamesA - gamesB || a.name.localeCompare(b.name);
          });

        for (const candidate of styleCandidates) {
          if (countInRole(role) >= MIN_CHAMPIONS_PER_ROLE) break;
          picks.push({
            championKey: candidate.championKey,
            name: candidate.name,
            role,
            state: 'testing',
            label: 'TU_ESTILO',
            reason: `Comparte estilo con lo que ya juegas en ${POOL_ROLE_LABELS[role]} (${candidate.championClass ?? topArchetype})`,
          });
          selected.add(candidate.championKey);
        }
      }
    }

    // 2c) Still short (little played variety and few style matches in this
    // role) — pad with any untried roster champion of the role so it still
    // reaches a valid pool on its own.
    if (countInRole(role) < MIN_CHAMPIONS_PER_ROLE) {
      const fallbackCandidates = roster
        .filter(
          (champion) =>
            champion.role === role && !selected.has(champion.championKey),
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const candidate of fallbackCandidates) {
        if (countInRole(role) >= MIN_CHAMPIONS_PER_ROLE) break;
        picks.push({
          championKey: candidate.championKey,
          name: candidate.name,
          role,
          state: 'testing',
          label: 'CUBRE_HUECO',
          reason: `Para completar tu pool de ${POOL_ROLE_LABELS[role]}`,
        });
        selected.add(candidate.championKey);
      }
    }
  }

  // 3) One starter pick for a role that's completely untouched and isn't
  // already one of the main roles above, so nothing is left at zero.
  const coveredRoles = new Set(picks.map((pick) => pick.role));
  const missingRole = POOL_ROLE_KEYS.find(
    (role) => !coveredRoles.has(role) && !mainRoles.includes(role),
  );
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
        'No encontramos una recomendación honesta con tus datos actuales. Arma tu pool a mano.',
    };
  }

  return { available: true, entries: picks };
}
