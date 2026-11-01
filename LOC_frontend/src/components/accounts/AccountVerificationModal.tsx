import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '../shared/Modal'
import { useConfirmAccountVerificationMutation, useStartAccountVerificationMutation } from '../../hooks/useApiMutations'
import { ApiError } from '../../lib/api'
import { getProfileIconUrl } from '../../lib/riotAssets'
import type { AccountVerificationModalProps } from '../../types/components'
import type { AccountVerificationChallenge } from '../../types/api'

// Riot can take a few minutes to show a new icon. Stays well under the
// backend's limit of 10 confirmations per minute.
const ICON_CHECK_INTERVAL_MS = 15_000

/** Proves a Riot account is the user's by having them equip a given profile icon in the game client. */
export function AccountVerificationModal({ target, ddragonVersion, onClose }: AccountVerificationModalProps) {
  const queryClient = useQueryClient()
  const [challenge, setChallenge] = useState<AccountVerificationChallenge | null>(null)
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState('')
  const [pendingNotice, setPendingNotice] = useState('')
  const [checkCount, setCheckCount] = useState(0)
  const startMutation = useStartAccountVerificationMutation()
  const { mutateAsync: confirmVerification, isPending: isConfirming } = useConfirmAccountVerificationMutation()

  const handleStart = async () => {
    setError('')
    try {
      setChallenge(await startMutation.mutateAsync(target))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo iniciar la verificación.')
    }
  }

  const checkIcon = useCallback(async () => {
    setError('')
    try {
      await confirmVerification()
      setPendingNotice('')
      await queryClient.invalidateQueries()
      setIsDone(true)
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'ICON_NOT_UPDATED') {
        setPendingNotice(caught.message)
        setCheckCount((count) => count + 1)
        return
      }
      setPendingNotice('')
      if (caught instanceof ApiError && caught.code === 'VERIFICATION_EXPIRED') setChallenge(null)
      setError(caught instanceof Error ? caught.message : 'No se pudo comprobar el ícono.')
    }
  }, [confirmVerification, queryClient])

  const isWaitingForRiot = pendingNotice !== ''

  useEffect(() => {
    if (!isWaitingForRiot) return
    const timer = window.setTimeout(() => void checkIcon(), ICON_CHECK_INTERVAL_MS)
    return () => window.clearTimeout(timer)
  }, [isWaitingForRiot, checkCount, checkIcon])

  const accountLabel = `${target.summoner}#${target.tag}`

  return (
    <Modal title="Verifica que la cuenta es tuya" onClose={onClose}>
      {isDone ? (
        <>
          <p className="auth-help">¡Listo! {accountLabel} quedó verificada. Ya puedes volver a poner tu ícono de siempre.</p>
          <button type="button" className="primary-btn auth-submit" onClick={onClose}>
            Cerrar
          </button>
        </>
      ) : challenge ? (
        <>
          <div className="verify-icon-row">
            {ddragonVersion && (
              <img
                className="verify-icon"
                src={getProfileIconUrl(challenge.iconId, ddragonVersion)}
                alt={`Ícono de perfil ${challenge.iconId}`}
                width={72}
                height={72}
              />
            )}
            <ol className="verify-steps">
              <li>Abre el cliente de League of Legends con {accountLabel}.</li>
              <li>
                Entra a tu perfil y equipa este ícono (n.º {challenge.iconId}). Es uno de los básicos, todas las cuentas
                lo tienen.
              </li>
              <li>
                Vuelve aquí y confirma antes de las{' '}
                {new Date(challenge.expiresAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}.
              </li>
            </ol>
          </div>
          <button
            type="button"
            className="primary-btn auth-submit"
            disabled={isConfirming || isWaitingForRiot}
            onClick={() => void checkIcon()}
          >
            {isConfirming || isWaitingForRiot ? 'Comprobando…' : 'Ya lo cambié'}
          </button>
          {isWaitingForRiot && (
            <p className="auth-help" role="status">
              {pendingNotice} Riot puede tardar unos minutos en mostrar el cambio. Lo comprobamos cada 15 segundos, no hace
              falta que pulses nada. Si cierras esta ventana, al volver verás el mismo ícono mientras no venza el plazo.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="auth-help">
            Te pediremos que cambies por un momento el ícono de perfil de {accountLabel}. Solo quien entra a esa cuenta
            puede hacerlo.
          </p>
          <button
            type="button"
            className="primary-btn auth-submit"
            disabled={startMutation.isPending}
            onClick={() => void handleStart()}
          >
            {startMutation.isPending ? 'Preparando…' : 'Empezar verificación'}
          </button>
        </>
      )}

      {error && (
        <p className="auth-status" role="alert">
          {error}
        </p>
      )}
    </Modal>
  )
}
