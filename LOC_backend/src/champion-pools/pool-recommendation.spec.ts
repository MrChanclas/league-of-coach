import type { ChampionPositionTotals } from '../stats/stats.service';
import type { RosterChampion } from './champion-roster.service';
import { computeRecommendation } from './pool-recommendation';
import { PoolStatsIndex } from './pool-stats';

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
    kills: gamesPlayed,
    deaths: gamesPlayed,
    assists: gamesPlayed,
  };
}

const roster: RosterChampion[] = [
  { championKey: 'Mel', name: 'Mel', role: 'MIDDLE', championClass: 'Maga' },
  {
    championKey: 'Alistar',
    name: 'Alistar',
    role: 'UTILITY',
    championClass: 'Tanque',
  },
];

describe('computeRecommendation', () => {
  it('suggests a champion in every main line it performs in', () => {
    const profile = {
      primaryRole: 'MIDDLE' as const,
      secondaryRole: 'UTILITY' as const,
    };
    const stats = new PoolStatsIndex(
      [row('Mel', 'MIDDLE', 6, 4), row('Mel', 'UTILITY', 5, 3)],
      profile,
    );

    const recommendation = computeRecommendation(roster, stats, [], profile);

    expect(recommendation.available).toBe(true);
    if (!recommendation.available) return;
    const melLines = recommendation.entries
      .filter((entry) => entry.championKey === 'Mel')
      .map((entry) => entry.role);
    expect(melLines).toEqual(['MIDDLE', 'UTILITY']);
  });

  it('skips a champion already in that line but still suggests it for the other one', () => {
    const profile = {
      primaryRole: 'MIDDLE' as const,
      secondaryRole: 'UTILITY' as const,
    };
    const stats = new PoolStatsIndex(
      [row('Mel', 'MIDDLE', 6, 4), row('Mel', 'UTILITY', 5, 3)],
      profile,
    );

    const recommendation = computeRecommendation(
      roster,
      stats,
      [{ championKey: 'Mel', slot: 'MIDDLE' }],
      profile,
    );

    if (!recommendation.available) throw new Error('expected a recommendation');
    expect(
      recommendation.entries
        .filter((entry) => entry.championKey === 'Mel')
        .map((entry) => entry.role),
    ).toEqual(['UTILITY']);
  });
});
