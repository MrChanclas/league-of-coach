import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import { mergeMessages } from '../lib/social'
import { CHAT_POLL_MS, DUO_LIST_POLL_MS, SOCIAL_SUMMARY_POLL_MS, queryKeys } from '../constants'
import type {
  DuoCandidatesResponse,
  DuoDetail,
  DuoGoalInput,
  DuoListItem,
  DuoMessage,
  DuoProfileInput,
  DuoProfileResponse,
  DuoRequestsResponse,
  SocialSummary,
} from '../types/social'

// Social has its own polling instead of a socket: Cloud Run runs several
// instances, so in-memory pushes wouldn't reach everyone. See CHAT_POLL_MS.

export function useSocialSummary(enabled: boolean) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.socialSummary(),
    queryFn: async () => apiFetch<SocialSummary>('/social/summary', { token: await getToken() }),
    enabled,
    refetchInterval: SOCIAL_SUMMARY_POLL_MS,
  })
}

export function useDuoProfile() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.socialProfile(),
    queryFn: async () => apiFetch<DuoProfileResponse>('/social/profile', { token: await getToken() }),
  })
}

export function useDuoCandidates(enabled: boolean) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.socialCandidates(),
    queryFn: async () => apiFetch<DuoCandidatesResponse>('/social/candidates', { token: await getToken() }),
    enabled,
  })
}

export function useDuoRequests() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.socialRequests(),
    queryFn: async () => apiFetch<DuoRequestsResponse>('/social/requests', { token: await getToken() }),
    refetchInterval: SOCIAL_SUMMARY_POLL_MS,
  })
}

export function useDuos() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.socialDuos(),
    queryFn: async () => apiFetch<DuoListItem[]>('/social/duos', { token: await getToken() }),
    refetchInterval: DUO_LIST_POLL_MS,
  })
}

export function useDuoDetail(duoId: string | null) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.socialDuo(duoId),
    queryFn: async () => apiFetch<DuoDetail>(`/social/duos/${duoId}`, { token: await getToken() }),
    enabled: Boolean(duoId),
  })
}

/**
 * The open chat. The first fetch loads the latest page; every poll after
 * that asks only for messages from the newest one already cached and merges
 * them in, so a long conversation isn't re-downloaded every few seconds.
 */
export function useDuoMessages(duoId: string | null, isActive: boolean) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: queryKeys.socialMessages(duoId),
    queryFn: async () => {
      const cached = queryClient.getQueryData<DuoMessage[]>(queryKeys.socialMessages(duoId)) ?? []
      const newest = cached.at(-1)?.createdAt
      const path = `/social/duos/${duoId}/messages${newest ? `?after=${encodeURIComponent(newest)}` : ''}`
      const fresh = await apiFetch<DuoMessage[]>(path, { token: await getToken() })
      return mergeMessages(cached, fresh)
    },
    enabled: Boolean(duoId),
    refetchInterval: isActive ? CHAT_POLL_MS : false,
  })
}

// Mutations only perform the call; SocialTabPanel owns the cache refresh,
// same split as useApiMutations.

export function useSaveDuoProfileMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (input: DuoProfileInput) =>
      apiFetch('/social/profile', { method: 'PUT', token: await getToken(), body: input }),
  })
}

export function useSendDuoRequestMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (input: { toUserId: string; message?: string }) =>
      apiFetch('/social/requests', { method: 'POST', token: await getToken(), body: input }),
  })
}

export function useRespondDuoRequestMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: 'accept' | 'decline' | 'cancel' }) =>
      apiFetch<{ id: string }>(`/social/requests/${requestId}/${action}`, { method: 'POST', token: await getToken() }),
  })
}

export function useSetDuoGoalMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async ({ duoId, input }: { duoId: string; input: DuoGoalInput }) =>
      apiFetch(`/social/duos/${duoId}/goal`, { method: 'PUT', token: await getToken(), body: input }),
  })
}

export function useRemoveDuoGoalMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (duoId: string) =>
      apiFetch(`/social/duos/${duoId}/goal`, { method: 'DELETE', token: await getToken(), parseJson: false }),
  })
}

export function useEndDuoMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (duoId: string) => apiFetch(`/social/duos/${duoId}/end`, { method: 'POST', token: await getToken() }),
  })
}

export function useReportDuoMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async ({ duoId, reason }: { duoId: string; reason: string }) =>
      apiFetch(`/social/duos/${duoId}/report`, {
        method: 'POST',
        token: await getToken(),
        body: { reason },
        parseJson: false,
      }),
  })
}

export function useSendDuoMessageMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async ({ duoId, body }: { duoId: string; body: string }) =>
      apiFetch<DuoMessage>(`/social/duos/${duoId}/messages`, { method: 'POST', token: await getToken(), body: { body } }),
  })
}

export function useMarkDuoReadMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (duoId: string) =>
      apiFetch(`/social/duos/${duoId}/read`, { method: 'POST', token: await getToken(), parseJson: false }),
  })
}

export function useSyncDiscordMutation() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async () =>
      apiFetch<{ discordId: string | null; discordUsername: string | null }>('/users/me/discord/sync', {
        method: 'POST',
        token: await getToken(),
      }),
  })
}
