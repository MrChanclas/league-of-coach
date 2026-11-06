import { useState } from 'react'
import { useSocialStanding } from '../../hooks/useSocial'

// Remembers, per browser, the newest strike already seen. Storage can be
// blocked: then the alert simply shows until it's closed on each visit.
const SEEN_KEY = 'loc-seen-strike'

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

/** Shown on every tab when the user gets a strike they haven't seen yet. */
export function StrikeAlert({ isSignedIn, onOpenSocial }: { isSignedIn: boolean; onOpenSocial: () => void }) {
  const latest = useSocialStanding(isSignedIn).data?.strikes[0]
  const [seenId, setSeenId] = useState(readSeen)

  if (!latest || latest.id === seenId) return null

  const markSeen = () => {
    try {
      localStorage.setItem(SEEN_KEY, latest.id)
    } catch {
      // Only hides it for this visit.
    }
    setSeenId(latest.id)
  }

  return (
    <div className="dashboard-status strike-alert" role="alert">
      <span>Recibiste un strike en Social por un reporte de duo: {latest.reason}</span>
      <div className="strike-alert-actions">
        <button
          type="button"
          className="secondary-btn"
          onClick={() => {
            markSeen()
            onOpenSocial()
          }}
        >
          Ver detalle
        </button>
        <button type="button" className="strike-alert-close" aria-label="Cerrar aviso" onClick={markSeen}>
          ×
        </button>
      </div>
    </div>
  )
}
