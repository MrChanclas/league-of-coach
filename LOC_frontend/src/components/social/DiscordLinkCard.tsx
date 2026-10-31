import { useState } from 'react'
import { useReverification, useUser } from '@clerk/clerk-react'
import { isReverificationCancelledError } from '@clerk/clerk-react/errors'
import { getClerkErrorMessage } from '../../lib/auth'
import type { DiscordLinkCardProps } from '../../types/components'

type UserResource = NonNullable<ReturnType<typeof useUser>['user']>

/**
 * Links Discord to an account that signed up with Google or email. Clerk
 * sends the player to Discord and back to this tab; SocialTabPanel then
 * copies the username to the backend. Clerk treats linking as a sensitive
 * action, so a session that is not fresh gets its verification modal first.
 */
export function DiscordLinkCard({ discordUsername }: DiscordLinkCardProps) {
  const { user } = useUser()
  const [error, setError] = useState('')
  const createDiscordAccount = useReverification((player: UserResource) =>
    player.createExternalAccount({
      strategy: 'oauth_discord',
      redirectUrl: `${window.location.origin}/#social`,
    }),
  )

  if (discordUsername) {
    return (
      <div className="social-card discord-card discord-card--linked">
        <div className="social-card-eyebrow">DISCORD</div>
        <p>
          Vinculado como <strong>{discordUsername}</strong>. Tus duos lo ven para coordinar también fuera de LoC.
        </p>
      </div>
    )
  }

  const handleLink = async () => {
    if (!user) return
    setError('')
    try {
      const account = await createDiscordAccount(user)
      const redirect = account.verification?.externalVerificationRedirectURL
      if (redirect) window.location.href = redirect.href
    } catch (linkError) {
      if (isReverificationCancelledError(linkError)) return
      setError(getClerkErrorMessage(linkError, 'No se pudo conectar con Discord.'))
    }
  }

  return (
    <div className="social-card discord-card">
      <div className="social-card-eyebrow">DISCORD</div>
      <p>Vincula tu Discord para que tus duos también puedan escribirte ahí. Es opcional.</p>
      <button type="button" className="secondary-btn" onClick={() => void handleLink()}>
        Vincular Discord
      </button>
      {error && <p className="social-error">{error}</p>}
    </div>
  )
}
