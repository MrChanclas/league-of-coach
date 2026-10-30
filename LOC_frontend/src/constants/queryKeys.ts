// Account-scoped keys share the ['account', accountId, ...] prefix so a
// single `invalidateQueries({ queryKey: queryKeys.account(id) })` refreshes
// every query for that account.
export const queryKeys = {
  internalUser: (clerkUserId: string | null | undefined) => ['internalUser', clerkUserId] as const,
  dashboard: (userId: string | undefined) => ['dashboard', userId] as const,
  platformStats: () => ['platformStats'] as const,
  account: (accountId: string | undefined) => ['account', accountId] as const,
  accountMatches: (accountId: string | undefined) => ['account', accountId, 'matches'] as const,
  accountStats: (accountId: string | undefined, queueId?: number, days?: number) =>
    ['account', accountId, 'stats', queueId ?? 'all', days ?? 'season'] as const,
  accountStreak: (accountId: string | undefined, queueId?: number) =>
    ['account', accountId, 'streak', queueId ?? 'all'] as const,
  accountLanes: (accountId: string | undefined) => ['account', accountId, 'lanes'] as const,
  accountActivity: (accountId: string | undefined) => ['account', accountId, 'activity'] as const,
  accountRankHistory: (accountId: string | undefined, queue: string) =>
    ['account', accountId, 'rankHistory', queue] as const,
  accountLessons: (accountId: string | undefined) => ['account', accountId, 'lessons'] as const,
  accountBehaviorFlags: (accountId: string | undefined) => ['account', accountId, 'behaviorFlags'] as const,
  accountsQueueStats: (accountIds: string[]) => ['accountsQueueStats', ...accountIds] as const,
  championGuide: (accountId: string | undefined, champion: string | undefined) =>
    ['account', accountId, 'championGuide', champion] as const,
  championRoster: () => ['championRoster'] as const,
  accountPool: (accountId: string | undefined) => ['account', accountId, 'pool'] as const,
  accountPoolRecommendation: (accountId: string | undefined) =>
    ['account', accountId, 'pool', 'recommendation'] as const,
}
