import { useEffect, useState } from 'react'
import { DEFAULT_TAB } from '../constants'
import { readTabFromLocation } from '../lib/navigation'
import type { TabKey } from '../types/dashboard'

/** Keeps the active tab in the URL hash so browser back/forward moves between tabs instead of leaving the app. */
export function useTabNavigation(isSignedIn: boolean | undefined) {
  const [activeTab, setActiveTab] = useState<TabKey>(() => readTabFromLocation() ?? DEFAULT_TAB)

  useEffect(() => {
    function handlePopState() {
      setActiveTab(readTabFromLocation() ?? DEFAULT_TAB)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Right when the dashboard first mounts for a signed-in user — whether
  // from an existing session or straight off the Google OAuth redirect back
  // to '/' — replace (not push) the current history entry with the active
  // tab's URL. That overwrites whatever entry was showing the login screen,
  // so "back" from inside the app lands on a previous tab or the app's own
  // starting point instead of a stale pre-login render.
  useEffect(() => {
    if (isSignedIn) {
      window.history.replaceState(null, '', `#${activeTab}`)
    }
    // Only the transition into a signed-in session should reset the history
    // baseline — not every tab change, which is handled by handleTabChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn])

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab)
    if (tab !== activeTab) window.history.pushState(null, '', `#${tab}`)
  }

  return { activeTab, handleTabChange }
}
