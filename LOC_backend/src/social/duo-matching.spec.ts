import { rankGoalProgress, scoreDuoMatch, type DuoCard } from './duo-matching';

const card = (overrides: Partial<DuoCard> = {}): DuoCard => ({
  roles: ['BOTTOM'],
  lookingFor: ['UTILITY'],
  availability: ['noche'],
  rank: { tier: 'EMERALD', division: 'II', lp: 40 },
  rankGoal: null,
  ...overrides,
});

describe('scoreDuoMatch', () => {
  it('rewards complementary lines both ways', () => {
    const me = card();
    const support = card({ roles: ['UTILITY'], lookingFor: ['BOTTOM'] });
    const match = scoreDuoMatch(me, support);

    expect(match.playsWhatIWant).toBe(true);
    expect(match.wantsWhatIPlay).toBe(true);
  });

  it('ranks a complementary partner above one that is not', () => {
    const me = card();
    const support = card({ roles: ['UTILITY'], lookingFor: ['BOTTOM'] });
    const top = card({ roles: ['TOP'], lookingFor: ['JUNGLE'] });

    expect(scoreDuoMatch(me, support).score).toBeGreaterThan(
      scoreDuoMatch(me, top).score,
    );
  });

  it('detects the same rank goal and shared hours', () => {
    const goal = { tier: 'DIAMOND', division: 'IV' };
    const match = scoreDuoMatch(
      card({ rankGoal: goal, availability: ['tarde', 'noche'] }),
      card({ rankGoal: goal, availability: ['noche'] }),
    );

    expect(match.sharedGoal).toEqual(goal);
    expect(match.sharedAvailability).toEqual(['noche']);
  });

  it('prefers the closer elo when everything else ties', () => {
    const me = card();
    const near = card({ rank: { tier: 'EMERALD', division: 'I', lp: 0 } });
    const far = card({ rank: { tier: 'PLATINUM', division: 'II', lp: 0 } });

    expect(scoreDuoMatch(me, near).score).toBeGreaterThan(
      scoreDuoMatch(me, far).score,
    );
  });
});

describe('rankGoalProgress', () => {
  it('completes only once the target rank is reached', () => {
    expect(
      rankGoalProgress(
        { tier: 'DIAMOND', division: 'IV', lp: 0 },
        { tier: 'DIAMOND', division: 'IV' },
      ),
    ).toEqual({ progress: 100, completed: true, lpRemaining: null });
  });

  it('caps an unfinished goal at 99% and reports the LP left', () => {
    const result = rankGoalProgress(
      { tier: 'EMERALD', division: 'I', lp: 99 },
      { tier: 'DIAMOND', division: 'IV' },
    );

    expect(result.completed).toBe(false);
    expect(result.progress).toBe(99);
    expect(result.lpRemaining).toBe(1);
  });

  it('is 0% and has no LP figure for an unranked account', () => {
    expect(
      rankGoalProgress(
        { tier: 'Unranked', division: 'Unranked', lp: 0 },
        { tier: 'GOLD', division: 'IV' },
      ),
    ).toEqual({ progress: 0, completed: false, lpRemaining: null });
  });
});
