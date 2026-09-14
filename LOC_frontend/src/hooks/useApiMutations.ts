import { useAuth } from '@clerk/clerk-react'
import { useMutation } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { GoalCreateInput, PoolEntryState, PoolSlotKey, ReplacePoolInput } from '../types/dashboard'

// These hooks only perform the API call — they deliberately don't own cache
// invalidation. That stays in App.tsx alongside the rest of each action's
// orchestration (status messages, selecting a new current account, etc.),
// the same place it lived before this migration.

export function useResolveAccountMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (input: { summoner: string; tag: string; server: string; userId: string }) => {
      const token = await getToken()
      const payload = await apiFetch<{ message?: string; found?: boolean; created?: boolean }>('/accounts/search', {
        method: 'POST',
        token,
        body: input,
      })
      if (!payload.found) {
        throw new Error(payload.message ?? 'No se pudo detectar la cuenta de Riot.')
      }
      return payload
    },
  })
}

export function useDeleteAccountMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (accountId: string) => {
      const token = await getToken()
      await apiFetch(`/accounts/${accountId}`, { method: 'DELETE', token, parseJson: false })
      return accountId
    },
  })
}

export function useCreateGoalMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (input: GoalCreateInput) => {
      const token = await getToken()
      return apiFetch('/goals', { method: 'POST', token, body: input })
    },
  })
}

export function useDeleteGoalMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (goalId: string) => {
      const token = await getToken()
      await apiFetch(`/goals/${goalId}`, { method: 'DELETE', token, parseJson: false })
      return goalId
    },
  })
}

export function useSyncMatchesMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (accountId: string) => {
      const token = await getToken()
      return apiFetch<{
        synced?: number
        skipped?: number
        relinked?: number
        // `seasonBackfill.done` is false while the backend still has season
        // history left to fetch: Riot's rate limit makes a full season
        // impossible to pull in one request, so the client keeps calling
        // until it comes back true (see matches.service.ts).
        seasonBackfill?: { done: boolean; oldestSyncedAt: string | null }
      }>(`/matches/sync/${accountId}`, {
        method: 'POST',
        token,
        body: {},
      })
    },
  })
}

export function useCompleteOnboardingMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (userId: string) => {
      const token = await getToken()
      return apiFetch(`/users/${userId}/onboarding-complete`, { method: 'POST', token })
    },
  })
}

export function useSavePoolMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async ({ accountId, input }: { accountId: string; input: ReplacePoolInput }) => {
      const token = await getToken()
      return apiFetch(`/champion-pools/account/${accountId}`, { method: 'PUT', token, body: input })
    },
  })
}

export function useAddPoolEntryMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async ({ accountId, championKey, role }: { accountId: string; championKey: string; role: PoolSlotKey }) => {
      const token = await getToken()
      return apiFetch(`/champion-pools/account/${accountId}/entries`, {
        method: 'POST',
        token,
        body: { championKey, role },
      })
    },
  })
}

export function useUpdatePoolEntryMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async ({
      accountId,
      championKey,
      role,
      patch,
    }: {
      accountId: string
      championKey: string
      role: PoolSlotKey
      patch: { state?: PoolEntryState; note?: string | null }
    }) => {
      const token = await getToken()
      return apiFetch(`/champion-pools/account/${accountId}/entries/${championKey}/${role}`, {
        method: 'PATCH',
        token,
        body: patch,
      })
    },
  })
}

export function useRemovePoolEntryMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async ({ accountId, championKey, role }: { accountId: string; championKey: string; role: PoolSlotKey }) => {
      const token = await getToken()
      await apiFetch(`/champion-pools/account/${accountId}/entries/${championKey}/${role}`, {
        method: 'DELETE',
        token,
        parseJson: false,
      })
      return championKey
    },
  })
}

export function useSubmitFeedbackMutation() {
  return useMutation({
    mutationFn: async (input: { message: string; email: string }) => {
      return apiFetch('/feedback', { method: 'POST', body: input })
    },
  })
}
