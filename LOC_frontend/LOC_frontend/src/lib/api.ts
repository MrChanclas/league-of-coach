export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4100').replace(/\/$/, '')

export async function fetchJson<T>(path: string, token: string | null): Promise<T | null> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  if (!response.ok) return null
  return (await response.json()) as T
}
