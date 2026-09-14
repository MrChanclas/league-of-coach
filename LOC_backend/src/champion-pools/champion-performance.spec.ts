import type { ChampionPositionTotals } from '../stats/stats.service';
import { evaluateChampionPerformance } from './champion-performance';
import type { RosterChampion } from './champion-roster.service';
import type { PoolRoleProfile } from './pool-roles';
import { PoolStatsIndex } from './pool-stats';

function champion(
  championKey: string,
  role: RosterChampion['role'],
  championClass: string | null = null,
): RosterChampion {
  return { championKey, name: championKey, role, championClass };
}

function row(
  championKey: string,
  teamPosition: string,
  gamesPlayed: number,
  wins: number,
): ChampionPositionTotals {
  return {
    champion: championKey,
    teamPosition,
    gamesPlayed,
    wins,
    kills: gamesPlayed * 2,
    deaths: gamesPlayed,
    assists: gamesPlayed * 2,
  };
}

const roster: RosterChampion[] = [
  champion('Nilah', 'BOTTOM', 'Luchadora'),
  champion('Tristana', 'BOTTOM', 'Tiradora'),
  champion('Garen', 'TOP', 'Luchador'),
  champion('Mel', 'MIDDLE', 'Maga'),
  champion('Alistar', 'UTILITY', 'Tanque / Iniciador'),
  champion('Seraphine', 'UTILITY', 'Maga / Encantadora'),
  champion('Lux', 'UTILITY', 'Maga de control'),
];

const botTopProfile: PoolRoleProfile = {
  primaryRole: 'BOTTOM',
  secondaryRole: 'TOP',
};

describe('evaluateChampionPerformance', () => {
  it('judges a champion separately in each line it is played in', () => {
    const stats = new PoolStatsIndex(
      [row('Mel', 'MIDDLE', 6, 1), row('Mel', 'UTILITY', 8, 6)],
      { primaryRole: 'MIDDLE', secondaryRole: 'UTILITY' },
    );

    expect(
      evaluateChampionPerformance('Mel', 'MIDDLE', roster, stats, new Set()),
    ).toMatchObject({ status: 'bad' });
    expect(
      evaluateChampionPerformance('Mel', 'UTILITY', roster, stats, new Set()),
    ).toEqual({ status: 'good' });
  });

  it('suggests a proven bot laner for a struggling bot pick', () => {
    const stats = new PoolStatsIndex(
      [
        row('Nilah', 'BOTTOM', 9, 3),
        row('Tristana', 'BOTTOM', 19, 13),
        row('Garen', 'TOP', 13, 9),
      ],
      botTopProfile,
    );

    expect(
      evaluateChampionPerformance('Nilah', 'BOTTOM', roster, stats, new Set()),
    ).toEqual({
      status: 'bad',
      substitute: { championKey: 'Tristana', name: 'Tristana', role: 'BOTTOM' },
    });
  });

  it('has nothing to say about a champion filed in a line it has no games in', () => {
    const stats = new PoolStatsIndex(
      [row('Nilah', 'BOTTOM', 9, 3), row('Garen', 'TOP', 13, 9)],
      botTopProfile,
    );

    expect(
      evaluateChampionPerformance('Nilah', 'TOP', roster, stats, new Set()),
    ).toEqual({ status: 'insufficient_data' });
  });

  it('looks for a FILL substitute in the lane those games were played in', () => {
    const stats = new PoolStatsIndex(
      [
        row('Nilah', 'BOTTOM', 9, 3),
        row('Tristana', 'BOTTOM', 19, 13),
        row('Garen', 'TOP', 13, 9),
        row('Garen', 'MIDDLE', 13, 9),
      ],
      { primaryRole: 'MIDDLE', secondaryRole: 'UTILITY' },
    );

    expect(
      evaluateChampionPerformance('Nilah', 'FILL', roster, stats, new Set()),
    ).toMatchObject({
      status: 'bad',
      substitute: { championKey: 'Tristana', role: 'BOTTOM' },
    });
  });

  it('only offers an untried champion that shares the playstyle, not the first one alphabetically', () => {
    const stats = new PoolStatsIndex([row('Seraphine', 'UTILITY', 10, 3)], {
      primaryRole: 'BOTTOM',
      secondaryRole: 'UTILITY',
    });

    expect(
      evaluateChampionPerformance(
        'Seraphine',
        'UTILITY',
        roster,
        stats,
        new Set(),
      ),
    ).toMatchObject({ status: 'bad', substitute: { championKey: 'Lux' } });
  });
});
