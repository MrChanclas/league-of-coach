import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../constants'
import {
  useDuoCandidates,
  useDuoProfile,
  useDuoRequests,
  useDuos,
  useRespondDuoRequestMutation,
  useSaveDuoProfileMutation,
  useSendDuoRequestMutation,
  useSyncDiscordMutation,
} from '../../hooks/useSocial'
import { useStatusMessage } from '../../hooks/useStatusMessage'
import { DiscordLinkCard } from './DiscordLinkCard'
import { DuoCandidateList } from './DuoCandidateList'
import { DuoDetailView } from './DuoDetailView'
import { DuoList } from './DuoList'
import { DuoProfileForm } from './DuoProfileForm'
import { DuoRequestList } from './DuoRequestList'
import type { SocialTabPanelProps } from '../../types/components'
import type { DuoProfileInput } from '../../types/social'

const RESPONSE_MESSAGES = {
  accept: '¡Duo formado! Ya pueden escribirse en el chat.',
  decline: 'Solicitud rechazada.',
  cancel: 'Solicitud cancelada.',
} as const

export function SocialTabPanel({ userAccounts, activeAccount, ddragonVersion }: SocialTabPanelProps) {
  const queryClient = useQueryClient()
  const { user } = useUser()
  const [status, setStatus] = useStatusMessage()
  const [openDuoId, setOpenDuoId] = useState<string | null>(null)
  const [sendingTo, setSendingTo] = useState<string | null>(null)

  const profileQuery = useDuoProfile()
  const profile = profileQuery.data?.profile ?? null
  const candidatesQuery = useDuoCandidates(Boolean(profile?.active))
  const requestsQuery = useDuoRequests()
  const duosQuery = useDuos()

  const saveProfileMutation = useSaveDuoProfileMutation()
  const sendRequestMutation = useSendDuoRequestMutation()
  const respondMutation = useRespondDuoRequestMutation()
  const { mutate: syncDiscord } = useSyncDiscordMutation()

  // After signing in with Discord, or coming back from linking it, Clerk
  // knows about the Discord account before the backend does. Copy it over
  // once per visit to the tab.
  const hasClerkDiscord = Boolean(
    user?.externalAccounts.some((account) => account.provider === 'discord'),
  )
  const storedDiscord = profileQuery.data?.discordUsername ?? null
  const hasSyncedDiscord = useRef(false)
  useEffect(() => {
    if (!profileQuery.isSuccess || hasSyncedDiscord.current) return
    if (hasClerkDiscord === Boolean(storedDiscord)) return
    hasSyncedDiscord.current = true
    syncDiscord(undefined, {
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.socialProfile() }),
    })
  }, [profileQuery.isSuccess, hasClerkDiscord, storedDiscord, syncDiscord, queryClient])

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.social() })

  const handleSaveProfile = async (input: DuoProfileInput) => {
    try {
      await saveProfileMutation.mutateAsync(input)
      await refresh()
      setStatus(input.active ? 'Perfil guardado. Ya apareces en la búsqueda de duo.' : 'Dejaste de aparecer en la búsqueda.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo guardar tu perfil.')
    }
  }

  const handleSendRequest = async (toUserId: string, message: string) => {
    setSendingTo(toUserId)
    try {
      await sendRequestMutation.mutateAsync({ toUserId, message: message || undefined })
      await refresh()
      setStatus('Solicitud enviada.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo enviar la solicitud.')
    } finally {
      setSendingTo(null)
    }
  }

  const handleRespond = async (requestId: string, action: 'accept' | 'decline' | 'cancel') => {
    try {
      const result = await respondMutation.mutateAsync({ requestId, action })
      await refresh()
      setStatus(RESPONSE_MESSAGES[action])
      if (action === 'accept') setOpenDuoId(result.id)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo responder la solicitud.')
    }
  }

  if (openDuoId) {
    return (
      <>
        {status && <p className="dashboard-status">{status}</p>}
        <DuoDetailView
          duoId={openDuoId}
          ddragonVersion={ddragonVersion}
          onBack={() => setOpenDuoId(null)}
          onStatus={setStatus}
        />
      </>
    )
  }

  return (
    <div className="view-content">
      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">COMUNIDAD</div>
          <h1>Social</h1>
          <p>
            Encuentra un duo con tu mismo objetivo y líneas que se complementan. El rango sale de tu cuenta de Riot,
            así que lo que ves es real.
          </p>
        </div>
      </div>

      {status && <p className="dashboard-status">{status}</p>}

      {userAccounts.length === 0 ? (
        <p className="empty-state">Vincula una cuenta de Riot en Cuentas para buscar duo.</p>
      ) : (
        <div className="social-grid">
          <div className="social-grid-main">
            {profileQuery.isSuccess && (
              <DuoProfileForm
                key={profile?.id ?? 'new'}
                profile={profile}
                userAccounts={userAccounts}
                ddragonVersion={ddragonVersion}
                defaultAccountId={activeAccount?.id}
                isSaving={saveProfileMutation.isPending}
                onSave={(input) => void handleSaveProfile(input)}
              />
            )}
            {profile?.active && (
              <DuoCandidateList
                candidates={candidatesQuery.data?.candidates ?? []}
                ddragonVersion={ddragonVersion}
                isLoading={candidatesQuery.isLoading}
                sendingTo={sendingTo}
                onSendRequest={(toUserId, message) => void handleSendRequest(toUserId, message)}
              />
            )}
          </div>

          <div className="social-grid-aside">
            {requestsQuery.data && (
              <DuoRequestList
                requests={requestsQuery.data}
                ddragonVersion={ddragonVersion}
                onRespond={(requestId, action) => void handleRespond(requestId, action)}
              />
            )}
            <DuoList duos={duosQuery.data ?? []} ddragonVersion={ddragonVersion} onOpen={setOpenDuoId} />
            <DiscordLinkCard discordUsername={storedDiscord} />
          </div>
        </div>
      )}
    </div>
  )
}
