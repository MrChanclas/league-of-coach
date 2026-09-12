/**
 * Shared definition of "primary/secondary role" for an account, used both to
 * gate which role-specific lessons show (lessons.service.ts) and to decide
 * whether a role-specific enrichment is even worth its Riot API cost at
 * ingestion time (matches.service.ts's Timeline API calls for peel/mid-roam
 * tracking) — a one-off autofill game in an off-role shouldn't count as that
 * role for either purpose.
 */
export type RoleProfile = {
  primaryRole: string | null;
  secondaryRole: string | null;
};

// A role needs at least this many games to count as someone's secondary
// role — otherwise a single autofill game would qualify.
const MIN_SECONDARY_ROLE_GAMES = 5;

export function deriveRoleProfile(
  laneCounts: Array<{ lane: string; games: number }>,
): RoleProfile {
  const sorted = [...laneCounts]
    .filter((entry) => entry.lane !== 'UNKNOWN')
    .sort((a, b) => b.games - a.games);

  return {
    primaryRole: sorted[0]?.lane ?? null,
    secondaryRole:
      sorted[1] && sorted[1].games >= MIN_SECONDARY_ROLE_GAMES
        ? sorted[1].lane
        : null,
  };
}

export function roleMatchesProfile(
  targetRoles: string[],
  profile: RoleProfile,
): boolean {
  return targetRoles.some(
    (role) => role === profile.primaryRole || role === profile.secondaryRole,
  );
}
