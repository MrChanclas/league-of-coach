import { computeWinratePace } from './goal-pace';

describe('computeWinratePace', () => {
  it('returns null with fewer than five games, since the pace would be noise', () => {
    expect(computeWinratePace(2, 4, 0.6)).toBeNull();
  });

  it('returns null when the target is already reached or not set', () => {
    expect(computeWinratePace(6, 10, 0.5)).toBeNull();
    expect(computeWinratePace(3, 10, 0)).toBeNull();
  });

  it('asks for a win streak when a short one closes the gap', () => {
    // (5 + 3) / (10 + 3) = 61.5% ≥ 60%, while two wins only reach 58.3%.
    expect(computeWinratePace(5, 10, 0.6)).toEqual({
      action: '3 victorias seguidas',
      context: 'PARA CERRARLO',
    });
  });

  it('switches to wins within a window when the streak would be too long', () => {
    // 40% → 55% needs a 17-game streak; 19 wins in the next 20 gets there.
    expect(computeWinratePace(20, 50, 0.55)).toEqual({
      action: '19 victorias en 20 partidas',
      context: 'RITMO NECESARIO',
    });
  });

  it('caps the ask at the largest window when no window closes the gap', () => {
    expect(computeWinratePace(10, 50, 0.5)).toEqual({
      action: '20 victorias en 20 partidas',
      context: 'RITMO NECESARIO',
    });
  });
});
