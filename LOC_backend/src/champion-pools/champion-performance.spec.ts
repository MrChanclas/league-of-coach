import { evaluateChampionPerformance } from './champion-performance';
import type { RosterChampion } from './champion-roster.service';
import type { ChampionStatEntry } from './pool-types';

const roster: RosterChampion[] = [
  { championKey: 'Nilah', name: 'Nilah', role: 'BOTTOM', championClass: null },
  {
    championKey: 'Tristana',
    name: 'Tristana',
    role: 'BOTTOM',
    championClass: null,
  },
  { championKey: 'Garen', name: 'Garen', role: 'TOP', championClass: null },
];

function stat(
  champion: string,
  gamesPlayed: number,
  wins: number,
): ChampionStatEntry {
  return {
    champion,
    gamesPlayed,
    wins,
    winrate: wins / gamesPlayed,
    avgKda: 2,
  };
}

// Solo/Duo numbers from the account that reported the bug.
const championStats = [
  stat('Nilah', 9, 3),
  stat('Tristana', 19, 13),
  stat('Garen', 13, 9),
];
const primaryRoleByChampion = new Map([
  ['Nilah', 'BOTTOM'],
  ['Tristana', 'BOTTOM'],
  ['Garen', 'TOP'],
]);

describe('evaluateChampionPerformance', () => {
  it('suggests a bot laner for a bot-played champion filed under Superior', () => {
    const tip = evaluateChampionPerformance(
      'Nilah',
      'TOP',
      roster,
      championStats,
      primaryRoleByChampion,
      new Set(),
    );

    expect(tip).toEqual({
      status: 'bad',
      substitute: { championKey: 'Tristana', name: 'Tristana', role: 'BOTTOM' },
    });
  });

  it('falls back to the pool slot when the champion has no played role yet', () => {
    const tip = evaluateChampionPerformance(
      'Nilah',
      'TOP',
      roster,
      championStats,
      new Map([['Garen', 'TOP']]),
      new Set(),
    );

    expect(tip).toMatchObject({
      status: 'bad',
      substitute: { championKey: 'Garen', role: 'TOP' },
    });
  });
});
