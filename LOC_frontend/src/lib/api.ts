export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4100').replace(/\/$/, '')

export class ApiError extends Error {}

type ApiFetchOptions = {
  method?: string
  token?: string | null
  body?: unknown
  // false for endpoints that respond with no body (e.g. some DELETEs) — skips the JSON parse.
  parseJson?: boolean
}

/**
 * Every backend call goes through here so token attachment and error shape
 * are consistent, and — unlike the old fetchJson, which swallowed failures
 * into `null` — actually throws on a non-OK response. React Query's
 * isError/error state and retry behavior depend on that.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', token, body, parseJson = true } = options

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    throw new ApiError(payload?.message ?? `No se pudo completar la solicitud (${response.status}).`)
  }

  if (!parseJson || response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
