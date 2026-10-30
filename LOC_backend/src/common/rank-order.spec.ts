import { rankGoalAnchor, rankScore, rankValue } from './rank-order';

describe('rankValue', () => {
  it('orders tiers and divisions, case-insensitively', () => {
    expect(rankValue('gold', 'ii')).toBe(rankValue('GOLD', 'II'));
    expect(rankValue('GOLD', 'I')).toBeGreaterThan(rankValue('GOLD', 'IV'));
    expect(rankValue('PLATINUM', 'IV')).toBeGreaterThan(rankValue('GOLD', 'I'));
  });

  it('puts Unranked below every real rank', () => {
    expect(rankValue('Unranked', null)).toBe(-1);
    expect(rankValue('IRON', 'IV')).toBeGreaterThan(-1);
  });
});

describe('rankScore', () => {
  it('adds LP on top of the division step, capped below the next step', () => {
    expect(rankScore('GOLD', 'II', 50)).toBe(rankScore('GOLD', 'II', 0) + 50);
    expect(rankScore('GOLD', 'II', 150)).toBe(rankScore('GOLD', 'II', 99));
    expect(rankScore('GOLD', 'II', 99)).toBeLessThan(rankScore('GOLD', 'I', 0));
  });

  it('gives Master, Grandmaster and Challenger the same base so LP stays continuous', () => {
    expect(rankScore('MASTER', null, 900)).toBe(
      rankScore('CHALLENGER', null, 900),
    );
    expect(rankScore('MASTER', null, 0)).toBeGreaterThan(
      rankScore('DIAMOND', 'I', 99),
    );
  });

  it('returns -1 for Unranked', () => {
    expect(rankScore('Unranked', null, 40)).toBe(-1);
  });
});

describe('rankGoalAnchor', () => {
  it('anchors one tier below the target, at its lowest division', () => {
    expect(rankGoalAnchor('PLATINUM')).toEqual({
      tier: 'GOLD',
      division: 'IV',
    });
    expect(rankGoalAnchor('MASTER')).toEqual({
      tier: 'DIAMOND',
      division: 'IV',
    });
  });

  it('never goes below Iron', () => {
    expect(rankGoalAnchor('IRON')).toEqual({ tier: 'IRON', division: 'IV' });
  });

  it('anchors every target above Master at Master', () => {
    expect(rankGoalAnchor('GRANDMASTER')).toEqual({
      tier: 'MASTER',
      division: null,
    });
    expect(rankGoalAnchor('CHALLENGER')).toEqual({
      tier: 'MASTER',
      division: null,
    });
  });
});
