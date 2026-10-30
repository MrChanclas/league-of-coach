import { TAB_KEYS } from '../constants'
import type { TabKey } from '../types/dashboard'

// Mirrors the tab in the URL hash so browser back/forward moves between
// tabs instead of leaving the app.
export function readTabFromLocation(): TabKey | null {
  const hash = window.location.hash.replace('#', '')
  return (TAB_KEYS as string[]).includes(hash) ? (hash as TabKey) : null
}
