import { ApiError, apiFetch } from './api'
import type { ApiFetchOptions } from '../types/api'

// Per tab and gone when it closes: the admin session shouldn't outlive the
// window it was opened in. Storage can be blocked, so every access is guarded.
const TOKEN_KEY = 'loc-admin-session'
export const ADMIN_LOGOUT_EVENT = 'loc-admin-logout'

export function readAdminToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function saveAdminToken(token: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Without storage the session still works until the page reloads.
  }
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nothing stored, nothing to clear.
  }
}

/** Calls the admin API with the stored session, and signs out when it's rejected. */
export async function adminFetch<T>(path: string, options: Omit<ApiFetchOptions, 'token'> = {}): Promise<T> {
  try {
    return await apiFetch<T>(`/admin${path}`, { ...options, token: readAdminToken() })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearAdminToken()
      window.dispatchEvent(new Event(ADMIN_LOGOUT_EVENT))
    }
    throw error
  }
}
