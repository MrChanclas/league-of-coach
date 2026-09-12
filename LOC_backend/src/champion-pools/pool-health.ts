import { MIN_CHAMPIONS_PER_ROLE, POOL_ROLE_KEYS } from './pool-roles';
import type { EnrichedPoolEntry } from './pool-types';

// Below this many total games across the whole pool, any score would mostly
// reflect noise — see handoff_loc/07-pool-champ.md: "Si no podés justificar
// el número, mostrá solo las tres notas [...] un puntaje sin fundamento es
// peor que ninguno."
const MIN_TOTAL_GAMES_FOR_SCORE = 15;
// Below this many games with a single champion, its winrate/share is not a
// signal yet — same threshold the rest of the app uses for "not enough data
// to say anything honest" (e.g. the 5B winrate column, LessonDetailView).
const MIN_GAMES_FOR_SIGNAL = 3;
// A single champion carrying this much of the pool's total games is treated
// as "concentrated" for the health note.
const CONCENTRATION_THRESHOLD = 0.6;

export type PoolHealthNote = { label: string };

export type PoolHealth = {
  // null when there isn't enough data yet to justify a number — render only
  // the three notes in that case, no ring.
  score: number | null;
  coverage: PoolHealthNote;
  concentration: PoolHealthNote;
  testing: PoolHealthNote;
};

export function computePoolHealth(entries: EnrichedPoolEntry[]): PoolHealth {
  // "Cubierta" means the role reached the minimum to count as a real pool
  // (MIN_CHAMPIONS_PER_ROLE), not just "has one champion in it" — a role with
  // 1-4 champions is still being built out.
  const countByRole = new Map<string, number>();
  for (const entry of entries) {
    countByRole.set(entry.role, (countByRole.get(entry.role) ?? 0) + 1);
  }
  const rolesCovered = POOL_ROLE_KEYS.filter(
    (role) => (countByRole.get(role) ?? 0) >= MIN_CHAMPIONS_PER_ROLE,
  ).length;
  const coverage: PoolHealthNote = {
    label: `${rolesCovered} de ${POOL_ROLE_KEYS.length} posiciones cubiertas`,
  };

  const totalGames = entries.reduce((sum, entry) => sum + entry.gamesPlayed, 0);
  const withEnoughData = entries.filter(
    (entry) => entry.gamesPlayed >= MIN_GAMES_FOR_SIGNAL,
  );
  const testingCount = entries.length - withEnoughData.length;
  const testing: PoolHealthNote = {
    label:
      testingCount > 0
        ? `${testingCount} campeón${testingCount === 1 ? '' : 'es'} sin datos suficientes todavía`
        : 'Todo tu pool tiene datos suficientes',
  };

  let maxShare = 0;
  let concentration: PoolHealthNote;
  if (totalGames === 0) {
    concentration = {
      label: 'Todavía no hay partidas para medir concentración',
    };
  } else {
    const busiest = [...entries].sort(
      (a, b) => b.gamesPlayed - a.gamesPlayed,
    )[0];
    maxShare = busiest.gamesPlayed / totalGames;
    concentration =
      maxShare >= CONCENTRATION_THRESHOLD
        ? {
            label: `El ${Math.round(maxShare * 100)}% de tus partidas están en ${busiest.name}`,
          }
        : { label: 'Tus partidas están repartidas entre el pool' };
  }

  const enoughDataToScore =
    entries.length > 0 && totalGames >= MIN_TOTAL_GAMES_FOR_SCORE;
  let score: number | null = null;
  if (enoughDataToScore) {
    const coverageScore = (rolesCovered / POOL_ROLE_KEYS.length) * 100;
    const evennessScore = Math.max(0, 100 - Math.round(maxShare * 100));
    const dataScore = (withEnoughData.length / entries.length) * 100;
    score = Math.round(
      coverageScore * 0.4 + evennessScore * 0.3 + dataScore * 0.3,
    );
  }

  return { score, coverage, concentration, testing };
}
