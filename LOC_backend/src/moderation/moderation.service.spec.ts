import { computeStanding } from './moderation.service';

const day = (n: number) => new Date(Date.UTC(2026, 0, n));

describe('computeStanding', () => {
  it('lets a user with fewer than 3 points into Social', () => {
    expect(computeStanding([{ points: 2, expiresAt: day(10) }])).toEqual({
      activePoints: 2,
      banned: false,
      bannedUntil: null,
    });
  });

  it('bans from 3 points on', () => {
    expect(computeStanding([{ points: 3, expiresAt: day(10) }])).toEqual({
      activePoints: 3,
      banned: true,
      bannedUntil: day(10),
    });
  });

  it('lifts the ban when enough strikes expire, not only the first one', () => {
    const standing = computeStanding([
      { points: 1, expiresAt: day(20) },
      { points: 1, expiresAt: day(5) },
      { points: 3, expiresAt: day(30) },
    ]);

    // 5 points: the one ending on day 5 leaves 4 and the one on day 20
    // leaves 3, still banned; only the grave strike's expiry drops it below.
    expect(standing.activePoints).toBe(5);
    expect(standing.bannedUntil).toEqual(day(30));
  });

  it('ends the ban at the first expiry that drops it below 3', () => {
    const standing = computeStanding([
      { points: 2, expiresAt: day(8) },
      { points: 2, expiresAt: day(15) },
    ]);

    expect(standing.bannedUntil).toEqual(day(8));
  });
});
