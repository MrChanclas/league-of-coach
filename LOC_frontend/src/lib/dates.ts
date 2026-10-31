const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days left until `deadline`, or null when there is none or it already passed. */
export function daysUntil(deadline?: string | null): number | null {
  if (!deadline) return null
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / DAY_MS)
  return days > 0 ? days : null
}
