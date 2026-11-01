import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import { QUEUE_IDS, TWITCH_LIVE_POLL_MS, queryKeys } from '../constants'
import type { MatchPageResponse, PlatformStatsResponse, TwitchLiveStatus } from '../types/api'
import type {
  AccountCard,
  AccountStatsSummary,
  ActivityDay,
  AuthUser,
  BehaviorFlag,
  ChampionGuideResponse,
  DashboardPayload,
  LaneEntry,
  LessonCard,
  PoolRecommendation,
  PoolView,
  QueueStats,
  RankSnapshotEntry,
  RosterChampion,
  StreakInfo,
} from '../types/dashboard'

/** Resolves (creating on first login) the app's own User for the signed-in Clerk identity. */
export function useInternalUser(
  isSignedIn: boolean,
  clerkUserId: string | null | undefined,
  displayName: string,
) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: queryKeys.internalUser(clerkUserId),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<AuthUser>('/users/me', {
        method: 'POST',
        token,
        body: { name: displayName },
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
    queryFn: () => apiFetch<PlatformStatsResponse>('/stats/platform'),
    staleTime: 5 * 60_000,
  })
}

export function useTwitchLive() {
  return useQuery({
    queryKey: queryKeys.twitchLive(),
    queryFn: () => apiFetch<TwitchLiveStatus>('/twitch/live'),
    refetchInterval: TWITCH_LIVE_POLL_MS,
  })
}

export function useAccountMatches(accountId: string | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.accountMatches(accountId),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<MatchPageResponse>(`/matches/account/${accountId}?pageSize=20`, { token })
    },
    enabled: Boolean(accountId),
  })
}

/** queueId omitted = combined solo + flex (the account's whole history). */
// `days` narrows the account-wide summary to a recent window; it doesn't
// apply to the per-queue one.
export function useAccountStats(accountId: string | undefined, queueId?: number, days?: number) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.accountStats(accountId, queueId, days),
    queryFn: async () => {
      const token = await getToken()
      const path = queueId
        ? `/stats/account/${accountId}/by-queue/${queueId}`
        : `/stats/account/${accountId}${days ? `?days=${days}` : ''}`
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

/** Account-wide detected weaknesses (role and champion), no champion filter — used to surface "errores detectados" in Aprendizaje. */
export function useAccountBehaviorFlags(accountId: string | undefined, isNeeded: boolean) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.accountBehaviorFlags(accountId),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<BehaviorFlag[]>(`/learning/account/${accountId}/behavior-flags`, { token })
    },
    enabled: Boolean(accountId) && isNeeded,
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
  const { getToken, isSignedIn } = useAuth()
  return useQuery({
    queryKey: queryKeys.championRoster(),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<RosterChampion[]>('/champion-pools/roster', { token })
    },
    enabled: Boolean(isSignedIn),
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

export function useAccountPoolRecommendation(accountId: string | undefined, isNeeded: boolean) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.accountPoolRecommendation(accountId),
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<PoolRecommendation>(`/champion-pools/account/${accountId}/recommendation`, { token })
    },
    enabled: Boolean(accountId) && isNeeded,
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
