import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import { QUEUE_IDS } from '../lib/constants'
import type {
  AccountCard,
  AccountStatsSummary,
  ActivityDay,
  AuthUser,
  ChampionSplitStat,
  DashboardPayload,
  LaneEntry,
  LessonCard,
  MatchParticipantEntry,
  QueueStats,
  RankSnapshotEntry,
  StreakInfo,
} from '../types/dashboard'

// Centralized so every hook/invalidation call agrees on the same keys.
// Account-scoped keys all share the ['account', accountId, ...] prefix so a
// single `invalidateQueries({ queryKey: queryKeys.account(id) })` (prefix
// match) refreshes everything for that account at once — e.g. after a match
// sync.
export const queryKeys = {
  internalUser: (clerkUserId: string | null | undefined) => ['internalUser', clerkUserId] as const,
  dashboard: (userId: string | undefined) => ['dashboard', userId] as const,
  platformStats: () => ['platformStats'] as const,
  account: (accountId: string | undefined) => ['account', accountId] as const,
  accountMatches: (accountId: string | undefined) => ['account', accountId, 'matches'] as const,
  accountStats: (accountId: string | undefined) => ['account', accountId, 'stats'] as const,
  accountStreak: (accountId: string | undefined) => ['account', accountId, 'streak'] as const,
  accountLanes: (accountId: string | undefined) => ['account', accountId, 'lanes'] as const,
  accountActivity: (accountId: string | undefined) => ['account', accountId, 'activity'] as const,
  accountChampions: (accountId: string | undefined, days: number) =>
    ['account', accountId, 'champions', days] as const,
  accountRankHistory: (accountId: string | undefined, queue: string) =>
    ['account', accountId, 'rankHistory', queue] as const,
  accountLessons: (accountId: string | undefined) => ['account', accountId, 'lessons'] as const,
  accountsQueueStats: (accountIds: string[]) => ['accountsQueueStats', ...accountIds] as const,
}


/** Resolves (creating on first login) the app's own User for the signed-in Clerk identity. */
export function useInternalUser(
  isSignedIn: boolean,
  clerkUserId: string | null | undefined,
  displayName: string,
  email: string,
) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: queryKeys.internalUser(clerkUserId),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<AuthUser>('/users/me', {
        method: 'POST',
        token,
        body: { name: displayName, email },
      })
    },
    enabled: Boolean(isSignedIn && clerkUserId),
    // The Clerk<->internal-user link doesn't change during a session.
    staleTime: Infinity,
  })
}

export function useDashboard(userId: string | undefined) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: queryKeys.dashboard(userId),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<DashboardPayload>(`/users/${userId}/dashboard`, { token })
    },
    enabled: Boolean(userId),
  })
}

export function usePlatformStats() {
  return useQuery({
    queryKey: queryKeys.platformStats(),
    queryFn: () => apiFetch<{ totalAccountsAnalyzed: number }>('/stats/platform'),
    staleTime: 5 * 60_000,
  })
}

export function useAccountMatches(accountId: string | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.accountMatches(accountId),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<{ items: MatchParticipantEntry[] }>(`/matches/account/${accountId}?pageSize=20`, { token })
    },
    enabled: Boolean(accountId),
  })
}

export function useAccountStats(accountId: string | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.accountStats(accountId),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<AccountStatsSummary>(`/stats/account/${accountId}`, { token })
    },
    enabled: Boolean(accountId),
  })
}

export function useAccountStreak(accountId: string | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.accountStreak(accountId),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<StreakInfo>(`/stats/account/${accountId}/streak`, { token })
    },
    enabled: Boolean(accountId),
  })
}

export function useAccountLanes(accountId: string | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.accountLanes(accountId),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<LaneEntry[]>(`/stats/account/${accountId}/lanes`, { token })
    },
    enabled: Boolean(accountId),
  })
}

export function useAccountActivity(accountId: string | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.accountActivity(accountId),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<ActivityDay[]>(`/stats/account/${accountId}/activity?days=7`, { token })
    },
    enabled: Boolean(accountId),
  })
}

export function useAccountChampions(accountId: string | undefined, days: number) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.accountChampions(accountId, days),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<ChampionSplitStat[]>(`/stats/account/${accountId}/champions?days=${days}`, { token })
    },
    enabled: Boolean(accountId),
  })
}

export function useAccountRankHistory(accountId: string | undefined, queue: 'solo' | 'flex') {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.accountRankHistory(accountId, queue),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<RankSnapshotEntry[]>(`/accounts/${accountId}/rank-history?queue=${queue}&days=90`, { token })
    },
    enabled: Boolean(accountId),
  })
}

export function useAccountLessons(accountId: string | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.accountLessons(accountId),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<LessonCard[]>(`/learning/account/${accountId}/lessons`, { token })
    },
    enabled: Boolean(accountId),
  })
}

/**
 * One combined query for every account's solo/flex summary — mirrors the
 * original single Promise.all-over-all-accounts effect in AccountsGrid.
 * (Hooks can't be called in a per-account loop, so this stays one query
 * rather than one-per-account.)
 */
export function useAccountsQueueStats(accounts: AccountCard[]) {
  const { getToken } = useAuth()
  const accountIds = accounts.map((account) => account.id)

  return useQuery({
    queryKey: queryKeys.accountsQueueStats(accountIds),
    queryFn: async () => {
      const token = await getToken()
      const entries = await Promise.all(
        accounts.map(async (account) => {
          const [solo, flex] = await Promise.all([
            apiFetch<AccountStatsSummary>(`/stats/account/${account.id}/by-queue/${QUEUE_IDS.SOLO}`, {
              token,
            }).catch(() => null),
            apiFetch<AccountStatsSummary>(`/stats/account/${account.id}/by-queue/${QUEUE_IDS.FLEX}`, {
              token,
            }).catch(() => null),
          ])
          return [account.id, { solo, flex }] as const
        }),
      )
      return Object.fromEntries(entries) as Record<string, QueueStats>
    },
    enabled: accounts.length > 0,
  })
}
