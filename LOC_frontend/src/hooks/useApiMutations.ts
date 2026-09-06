import { useAuth } from '@clerk/clerk-react'
import { useMutation } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { GoalCreateInput } from '../types/dashboard'

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
      return apiFetch<{ synced?: number; skipped?: number; relinked?: number }>(`/matches/sync/${accountId}`, {
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

export function useSubmitFeedbackMutation() {
  return useMutation({
    mutationFn: async (input: { message: string; email: string }) => {
      return apiFetch('/feedback', { method: 'POST', body: input })
    },
  })
}
