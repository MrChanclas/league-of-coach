import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '../shared/Modal'
import { useConfirmAccountVerificationMutation, useStartAccountVerificationMutation } from '../../hooks/useApiMutations'
import { getProfileIconUrl } from '../../lib/riotAssets'
import type { AccountVerificationModalProps } from '../../types/components'
import type { AccountVerificationChallenge } from '../../types/api'

/** Proves a Riot account is the user's by having them equip a given profile icon in the game client. */
export function AccountVerificationModal({ target, ddragonVersion, onClose }: AccountVerificationModalProps) {
  const queryClient = useQueryClient()
  const [challenge, setChallenge] = useState<AccountVerificationChallenge | null>(null)
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState('')
  const startMutation = useStartAccountVerificationMutation()
  const confirmMutation = useConfirmAccountVerificationMutation()

  const handleStart = async () => {
    setError('')
    try {
      setChallenge(await startMutation.mutateAsync(target))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo iniciar la verificación.')
    }
  }

  const handleConfirm = async () => {
    setError('')
    try {
      await confirmMutation.mutateAsync()
      await queryClient.invalidateQueries()
      setIsDone(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo comprobar el ícono.')
    }
  }

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
              <li>Entra a tu perfil y equipa este ícono. Es uno de los básicos, todas las cuentas lo tienen.</li>
              <li>Vuelve aquí y confirma. Tienes 15 minutos.</li>
            </ol>
          </div>
          <button
            type="button"
            className="primary-btn auth-submit"
            disabled={confirmMutation.isPending}
            onClick={() => void handleConfirm()}
          >
            {confirmMutation.isPending ? 'Comprobando…' : 'Ya lo cambié'}
          </button>
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
