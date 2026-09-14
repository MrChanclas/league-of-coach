import type { RosterChampion } from './champion-roster.service';
import { primaryArchetype } from './champion-style';
import {
  MIN_CHAMPIONS_PER_ROLE,
  POOL_ROLE_LABELS,
  type PoolRoleKey,
  type PoolRoleProfile,
  type PoolSlotKey,
} from './pool-roles';
import type { PoolStatsIndex } from './pool-stats';
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
 * The coach's pool suggestion. Fills the player's primary and secondary line
 * (the same ones the board offers as slots) up to MIN_CHAMPIONS_PER_ROLE:
 * proven performers in that exact lane first ("YA TE RINDE"), then champions
 * sharing a playstyle with what's already played in that lane ("TU ESTILO"),
 * then — only if a role still isn't full — any untried roster champion of
 * that role as a last resort, so the role reaches a valid pool on its own.
 * Lines are filled independently, so a champion that performs in both (Mel
 * mid and support) is suggested in both. The FILL slot is left to the
 * player: it has no lane to recommend for. Pure function so it can be
 * unit-tested without a database — see handoff_loc/07-pool-champ.md.
 */
export function computeRecommendation(
  roster: RosterChampion[],
  stats: PoolStatsIndex,
  existingEntries: Array<{ championKey: string; slot: PoolSlotKey }>,
  roleProfile: PoolRoleProfile,
): PoolRecommendation {
  if (stats.totalGames() < MIN_TOTAL_GAMES_FOR_RECOMMENDATION) {
    return {
      available: false,
      reason:
        'Todavía no hay partidas suficientes para una recomendación honesta. Arma tu pool a mano por ahora.',
    };
  }

  const rosterByKey = new Map(
    roster.map((champion) => [champion.championKey, champion]),
  );
  const picks: RecommendationEntry[] = [];

  // 1) The player's main lines, as the board defines them.
  const mainRoles = [roleProfile.primaryRole, roleProfile.secondaryRole].filter(
    (role): role is PoolRoleKey => role != null,
  );

  // 2) Fill each main role up to MIN_CHAMPIONS_PER_ROLE.
  for (const role of mainRoles) {
    const selected = new Set(
      existingEntries
        .filter((entry) => entry.slot === role)
        .map((entry) => entry.championKey),
    );
    const countInRole = () => picks.filter((pick) => pick.role === role).length;
    const gamesInRole = (championKey: string) =>
      stats.statAtLane(championKey, role)?.gamesPlayed ?? 0;

    // 2a) YA TE RINDE — real performance in this exact lane, best winrate
    // first among champions with enough games to mean something.
    const performers = stats
      .champions()
      .filter((champion) => !selected.has(champion))
      .map((champion) => stats.statAtLane(champion, role))
      .filter(
        (stat): stat is ChampionStatEntry =>
          stat != null && stat.gamesPlayed >= MIN_GAMES_FOR_PERFORMANCE_PICK,
      )
      .sort((a, b) => b.winrate - a.winrate || b.gamesPlayed - a.gamesPlayed);

    for (const candidate of performers) {
      if (countInRole() >= MIN_CHAMPIONS_PER_ROLE) break;
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
    // archetype of what's already played in this lane, preferring ones
    // untried so it's a genuine suggestion rather than restating 2a.
    if (countInRole() < MIN_CHAMPIONS_PER_ROLE) {
      const roleArchetypeWeights = new Map<string, number>();
      for (const champion of stats.champions()) {
        const games = gamesInRole(champion);
        if (games === 0) continue;
        const archetype = primaryArchetype(
          rosterByKey.get(champion)?.championClass,
        );
        if (!archetype) continue;
        roleArchetypeWeights.set(
          archetype,
          (roleArchetypeWeights.get(archetype) ?? 0) + games,
        );
      }
      const topArchetype =
        [...roleArchetypeWeights.entries()].sort(
          (a, b) => b[1] - a[1],
        )[0]?.[0] ?? null;

      if (topArchetype) {
        const styleCandidates = roster
          .filter(
            (champion) =>
              champion.role === role &&
              !selected.has(champion.championKey) &&
              primaryArchetype(champion.championClass) === topArchetype,
          )
          .sort(
            (a, b) =>
              gamesInRole(a.championKey) - gamesInRole(b.championKey) ||
              a.name.localeCompare(b.name),
          );

        for (const candidate of styleCandidates) {
          if (countInRole() >= MIN_CHAMPIONS_PER_ROLE) break;
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
    if (countInRole() < MIN_CHAMPIONS_PER_ROLE) {
      const fallbackCandidates = roster
        .filter(
          (champion) =>
            champion.role === role && !selected.has(champion.championKey),
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const candidate of fallbackCandidates) {
        if (countInRole() >= MIN_CHAMPIONS_PER_ROLE) break;
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

  if (picks.length === 0) {
    return {
      available: false,
      reason:
        'No encontramos una recomendación honesta con tus datos actuales. Arma tu pool a mano.',
    };
  }

  return { available: true, entries: picks };
}
