import { useState } from 'react'
import { TWITCH_DISMISSED_STREAM_KEY, TWITCH_STREAMER_NAME } from '../../constants'
import { useTwitchLive } from '../../hooks/useApiQueries'

// Storage can be blocked (private mode, cleared site data): then the banner
// just closes for this visit.
function readDismissedStream() {
  try {
    return localStorage.getItem(TWITCH_DISMISSED_STREAM_KEY)
  } catch {
    return null
  }
}

function saveDismissedStream(streamId: string) {
  try {
    localStorage.setItem(TWITCH_DISMISSED_STREAM_KEY, streamId)
  } catch {
    // Closed for this visit only.
  }
}

/**
 * Tells players when the channel is live on Twitch. Closing it hides it for
 * that stream only; the next stream shows it again.
 */
export function TwitchLiveBanner() {
  const { data } = useTwitchLive()
  const [dismissedStream, setDismissedStream] = useState(readDismissedStream)

  if (!data?.live || dismissedStream === data.streamId) return null

  const handleDismiss = () => {
    saveDismissedStream(data.streamId)
    setDismissedStream(data.streamId)
  }

  return (
    <aside className="twitch-banner" aria-label="Stream en vivo">
      <span className="twitch-banner-live">
        <span className="twitch-banner-dot" aria-hidden="true" />
        EN VIVO
      </span>
      <div className="twitch-banner-text">
        <strong>{TWITCH_STREAMER_NAME} está en vivo en Twitch</strong>
        <span className="twitch-banner-title" title={data.title}>
          {data.title}
        </span>
        <span className="twitch-banner-meta">
          {data.gameName} · {data.viewerCount} {data.viewerCount === 1 ? 'espectador' : 'espectadores'}
        </span>
      </div>
      <a className="twitch-banner-cta" href={data.channelUrl} target="_blank" rel="noopener noreferrer">
        Ver en Twitch
      </a>
      <button type="button" className="twitch-banner-close" onClick={handleDismiss} aria-label="Cerrar aviso">
        ×
      </button>
    </aside>
  )
}
