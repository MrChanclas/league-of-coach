import { useAuth } from '@clerk/clerk-react'
import { useMutation } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type {
  AccountVerificationChallenge,
  AccountVerificationTarget,
  FeedbackInput,
  PoolEntryMutationInput,
  SavePoolMutationInput,
  SyncMatchesResponse,
  UpdatePoolEntryMutationInput,
} from '../types/api'
import type { GoalCreateInput } from '../types/dashboard'

// These hooks only perform the API call — they deliberately don't own cache
// invalidation. That stays in App.tsx alongside the rest of each action's
// orchestration (status messages, selecting a new current account, etc.),
// the same place it lived before this migration.

export function useStartAccountVerificationMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (target: AccountVerificationTarget) =>
      apiFetch<AccountVerificationChallenge>('/accounts/verification', {
        method: 'POST',
        token: await getToken(),
        body: target,
      }),
  })
}

export function useConfirmAccountVerificationMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async () =>
      apiFetch<{ account: { id: string } }>('/accounts/verification/confirm', {
        method: 'POST',
        token: await getToken(),
      }),
  })
}

export function useDeleteUserMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (userId: string) => {
      await apiFetch(`/users/${userId}`, { method: 'DELETE', token: await getToken(), parseJson: false })
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
      return apiFetch<SyncMatchesResponse>(`/matches/sync/${accountId}`, {
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
    mutationFn: async ({ accountId, input }: SavePoolMutationInput) => {
      const token = await getToken()
      return apiFetch(`/champion-pools/account/${accountId}`, { method: 'PUT', token, body: input })
    },
  })
}

export function useAddPoolEntryMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async ({ accountId, championKey, role }: PoolEntryMutationInput) => {
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
    }: UpdatePoolEntryMutationInput) => {
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
    mutationFn: async ({ accountId, championKey, role }: PoolEntryMutationInput) => {
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
    mutationFn: async (input: FeedbackInput) => {
      return apiFetch('/feedback', { method: 'POST', body: input })
    },
  })
}
