import { Modal } from '../shared/Modal'
import type { AccountSearchModalProps } from '../../types/components'

export function AccountSearchModal({
  isOpen,
  accountForm,
  status,
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

          <p className="auth-help">Se realizará una búsqueda en Riot para comprobar que esa cuenta existe antes de vincularla a tu perfil.</p>

          <button type="submit" className="primary-btn auth-submit">Detectar cuenta</button>
        </form>

        {status && <p className="auth-status">{status}</p>}
    </Modal>
  )
}
