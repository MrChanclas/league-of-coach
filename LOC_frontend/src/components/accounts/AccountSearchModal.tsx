import { Modal } from '../shared/Modal'
import type { AccountSearchModalProps } from '../../types/components'

export function AccountSearchModal({
  isOpen,
  accountForm,
  status,
  isSubmitting,
  onClose,
  onAccountFieldChange,
  onCreateAccount,
}: AccountSearchModalProps) {
  if (!isOpen) return null

  return (
    <Modal title="Buscar cuenta Riot" onClose={onClose}>

        <form className="auth-form" onSubmit={onCreateAccount}>
          <label>
            Nombre del invocador
            <input
              name="summoner"
              value={accountForm.summoner}
              onChange={onAccountFieldChange}
              placeholder="Ej: Captain Chala (sin #tag)"
              required
            />
          </label>
          <label>
            Tag
            <input name="tag" value={accountForm.tag} onChange={onAccountFieldChange} placeholder="Ej: LAS" required />
          </label>
          <label>
            Servidor
            <input name="server" value={accountForm.server} onChange={onAccountFieldChange} placeholder="Ej: LAS" required />
          </label>

          <p className="auth-help">
            Buscaremos la cuenta en Riot y te pediremos cambiar por un momento su ícono de perfil para comprobar que es tuya.
          </p>

          <button type="submit" className="primary-btn auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Buscando…' : 'Continuar'}
          </button>
        </form>

        {status && <p className="auth-status">{status}</p>}
    </Modal>
  )
}
