import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import { QUEUE_IDS } from '../lib/constants'
import type {
  AccountCard,
  AccountStatsSummary,
  ActivityDay,
  AuthUser,
  ChampionGuideResponse,
  DashboardPayload,
  LaneEntry,
  LessonCard,
  MatchParticipantEntry,
  PoolRecommendation,
  PoolView,
  QueueStats,
  RankSnapshotEntry,
  RosterChampion,
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
  accountStats: (accountId: string | undefined, queueId?: number) =>
    ['account', accountId, 'stats', queueId ?? 'all'] as const,
  accountStreak: (accountId: string | undefined, queueId?: number) =>
    ['account', accountId, 'streak', queueId ?? 'all'] as const,
  accountLanes: (accountId: string | undefined) => ['account', accountId, 'lanes'] as const,
  accountActivity: (accountId: string | undefined) => ['account', accountId, 'activity'] as const,
  accountRankHistory: (accountId: string | undefined, queue: string) =>
    ['account', accountId, 'rankHistory', queue] as const,
  accountLessons: (accountId: string | undefined) => ['account', accountId, 'lessons'] as const,
  accountsQueueStats: (accountIds: string[]) => ['accountsQueueStats', ...accountIds] as const,
  championGuide: (accountId: string | undefined, champion: string | undefined) =>
    ['account', accountId, 'championGuide', champion] as const,
  championRoster: () => ['championRoster'] as const,
  accountPool: (accountId: string | undefined) => ['account', accountId, 'pool'] as const,
  accountPoolRecommendation: (accountId: string | undefined) =>
    ['account', accountId, 'pool', 'recommendation'] as const,
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

/** queueId omitted = combined solo + flex (the account's whole history). */
export function useAccountStats(accountId: string | undefined, queueId?: number) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.accountStats(accountId, queueId),
    queryFn: async () => {
      const token = await getToken()
      const path = queueId
        ? `/stats/account/${accountId}/by-queue/${queueId}`
        : `/stats/account/${accountId}`
      return apiFetch<AccountStatsSummary>(path, { token })
    },
    enabled: Boolean(accountId),
  })
}

/** queueId omitted = combined solo + flex (the account's whole history). */
export function useAccountStreak(accountId: string | undefined, queueId?: number) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.accountStreak(accountId, queueId),
    queryFn: async () => {
      const token = await getToken()
      const path = queueId
        ? `/stats/account/${accountId}/streak/by-queue/${queueId}`
        : `/stats/account/${accountId}/streak`
      return apiFetch<StreakInfo>(path, { token })
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

/** Champion guide (identity, class, difficulty, tips) plus this account's behavior flags for that champion. */
export function useChampionGuide(accountId: string | undefined, champion: string | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.championGuide(accountId, champion),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<ChampionGuideResponse>(`/champion-guides/${champion}?accountId=${accountId}`, { token })
    },
    enabled: Boolean(accountId && champion),
    // Guide content only changes with a patch or a manual edit — no need to refetch on every focus.
    staleTime: 5 * 60_000,
  })
}

/** Full champion roster (id, name, role, class) for the Pool Champ grid — not account-scoped. */
export function useChampionRoster() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.championRoster(),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<RosterChampion[]>('/champion-pools/roster', { token })
    },
    // The champion list only changes with a patch — no need to refetch often.
    staleTime: 30 * 60_000,
  })
}

export function useAccountPool(accountId: string | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.accountPool(accountId),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<PoolView>(`/champion-pools/account/${accountId}`, { token })
    },
    enabled: Boolean(accountId),
  })
}

export function useAccountPoolRecommendation(accountId: string | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.accountPoolRecommendation(accountId),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<PoolRecommendation>(`/champion-pools/account/${accountId}/recommendation`, { token })
    },
    enabled: Boolean(accountId),
    // Only shifts when the account's stats shift meaningfully — no need to
    // recompute on every focus while the Pool Champ tab is just sitting open.
    staleTime: 60_000,
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
