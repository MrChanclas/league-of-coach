const STREAK_THRESHOLD = 15;
const WINDOW_CANDIDATES = [8, 10, 15, 20];

export type WinratePace = {
  action: string;
  context: string;
};

/**
 * Translates a winrate gap into a concrete action: how many consecutive
 * wins would close it, or — if that streak is unrealistically long — how
 * many wins within a reasonably-sized window of upcoming games.
 */
export function computeWinratePace(wins: number, games: number, target: number): WinratePace | null {
  if (games < 5) return null;
  if (target <= 0 || wins / games >= target) return null;

  const streak = minConsecutiveWins(wins, games, target);
  if (streak <= STREAK_THRESHOLD) {
    return { action: `${streak} victoria${streak === 1 ? '' : 's'} seguidas`, context: 'PARA CERRARLO' };
  }

  for (const window of WINDOW_CANDIDATES) {
    const neededWins = Math.ceil(target * (games + window) - wins);
    if (neededWins <= window) {
      return { action: `${neededWins} victorias en ${window} partidas`, context: 'RITMO NECESARIO' };
    }
  }

  // No reasonable window closes it either — still give the largest one.
  const window = WINDOW_CANDIDATES[WINDOW_CANDIDATES.length - 1];
  const neededWins = Math.min(window, Math.ceil(target * (games + window) - wins));
  return { action: `${neededWins} victorias en ${window} partidas`, context: 'RITMO NECESARIO' };
}

function minConsecutiveWins(wins: number, games: number, target: number): number {
  for (let n = 1; n <= 1000; n += 1) {
    if ((wins + n) / (games + n) >= target) return n;
  }
  return 1000;
}
