import type { ApiErrorPayload, ApiFetchOptions } from '../types/api'
import { API_URL } from '../constants/runtime'

export { API_URL }

export class ApiError extends Error {
  // Machine-readable reason, when the backend sends one (e.g. ACCOUNT_CLAIMABLE).
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
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
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null
    // ZodValidationPipe replies with a generic top-level "Validation failed"
    // plus a per-issue `errors` array — surface those specific messages
    // (e.g. "Superior tiene 3 campeones: hacen falta al menos 5…") instead
    // of the generic one whenever they're present.
    const detailedMessage = payload?.errors
      ?.map((issue) => issue.message)
      .filter(Boolean)
      .join(' ')
    throw new ApiError(
      detailedMessage || payload?.message || `No se pudo completar la solicitud (${response.status}).`,
      payload?.code,
    )
  }

  if (!parseJson || response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
