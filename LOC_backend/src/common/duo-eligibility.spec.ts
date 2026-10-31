import { canDuo } from './duo-eligibility';

const rank = (tier: string, division = 'IV', lp = 0) => ({
  tier,
  division,
  lp,
});

describe('canDuo (solo)', () => {
  it('allows neighbouring tiers inside the published ranges', () => {
    expect(canDuo('solo', rank('GOLD', 'II'), rank('PLATINUM', 'I'))).toBe(
      true,
    );
    expect(canDuo('solo', rank('IRON'), rank('SILVER', 'I'))).toBe(true);
  });

  it('rejects pairs outside either player range', () => {
    // Silver may queue up to Gold, so Platinum is out.
    expect(canDuo('solo', rank('SILVER'), rank('PLATINUM'))).toBe(false);
    // Emerald reaches Diamond III at most.
    expect(canDuo('solo', rank('EMERALD', 'I'), rank('DIAMOND', 'II'))).toBe(
      false,
    );
  });

  it('applies the LP rules around Master', () => {
    expect(canDuo('solo', rank('DIAMOND', 'I'), rank('MASTER', 'I', 150))).toBe(
      true,
    );
    expect(canDuo('solo', rank('DIAMOND', 'I'), rank('MASTER', 'I', 250))).toBe(
      false,
    );
    expect(
      canDuo('solo', rank('MASTER', 'I', 100), rank('MASTER', 'I', 450)),
    ).toBe(true);
    expect(
      canDuo('solo', rank('MASTER', 'I', 100), rank('MASTER', 'I', 600)),
    ).toBe(false);
  });

  it('never pairs Grandmaster or Challenger', () => {
    expect(canDuo('solo', rank('GRANDMASTER', 'I'), rank('MASTER', 'I'))).toBe(
      false,
    );
    expect(
      canDuo('solo', rank('Unranked', 'Unranked'), rank('CHALLENGER')),
    ).toBe(false);
  });

  it('lets unranked accounts pair with anyone below Grandmaster', () => {
    expect(canDuo('solo', rank('Unranked', 'Unranked'), rank('DIAMOND'))).toBe(
      true,
    );
  });
});

describe('canDuo (flex)', () => {
  it('has no restrictions up to Diamond', () => {
    expect(canDuo('flex', rank('IRON'), rank('DIAMOND', 'I'))).toBe(true);
  });

  it('falls back to the solo rules above Diamond', () => {
    expect(canDuo('flex', rank('GOLD'), rank('MASTER', 'I', 50))).toBe(false);
  });
});
