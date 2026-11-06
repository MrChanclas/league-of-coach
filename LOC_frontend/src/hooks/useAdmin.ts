import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminFetch } from '../lib/adminApi'
import { apiFetch } from '../lib/api'
import type {
  AdminDuo,
  AdminLoginResponse,
  AdminOverview,
  AdminReport,
  AdminStrike,
  AdminUser,
  ReportDecision,
} from '../types/admin'

// Everything admin shares the 'admin' prefix, so one invalidation refreshes
// the whole panel after a decision.
const adminKeys = {
  all: () => ['admin'] as const,
  overview: () => ['admin', 'overview'] as const,
  reports: (status: string) => ['admin', 'reports', status] as const,
  users: (search: string) => ['admin', 'users', search] as const,
  userStrikes: (userId: string) => ['admin', 'users', userId, 'strikes'] as const,
  duos: (status: string) => ['admin', 'duos', status] as const,
}

export function useAdminLoginMutation() {
  return useMutation({
    mutationFn: (input: { username: string; password: string }) =>
      apiFetch<AdminLoginResponse>('/admin/login', { method: 'POST', body: input }),
  })
}

export function useAdminOverview() {
  return useQuery({ queryKey: adminKeys.overview(), queryFn: () => adminFetch<AdminOverview>('/overview') })
}

export function useAdminReports(status: 'pending' | 'resolved') {
  return useQuery({
    queryKey: adminKeys.reports(status),
    queryFn: () => adminFetch<AdminReport[]>(`/reports?status=${status}`),
  })
}

export function useAdminUsers(search: string) {
  return useQuery({
    queryKey: adminKeys.users(search),
    queryFn: () => adminFetch<AdminUser[]>(`/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  })
}

export function useAdminUserStrikes(userId: string | null) {
  return useQuery({
    queryKey: adminKeys.userStrikes(userId ?? ''),
    queryFn: () => adminFetch<AdminStrike[]>(`/users/${userId}/strikes`),
    enabled: Boolean(userId),
  })
}

export function useAdminDuos(status: 'active' | 'ended') {
  return useQuery({
    queryKey: adminKeys.duos(status),
    queryFn: () => adminFetch<AdminDuo[]>(`/duos?status=${status}`),
  })
}

export function useResolveReportMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ reportId, decision, reason }: { reportId: string; decision: ReportDecision; reason: string }) =>
      adminFetch(`/reports/${reportId}/resolve`, {
        method: 'POST',
        body: { decision, reason: reason.trim() || undefined },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all() }),
  })
}

export function useRevokeStrikeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (strikeId: string) => adminFetch(`/strikes/${strikeId}/revoke`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all() }),
  })
}
