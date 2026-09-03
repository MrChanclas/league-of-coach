import type { FormEvent } from 'react'
import type { AccountForm } from '../types/dashboard'

type AccountSearchModalProps = {
  isOpen: boolean
  accountForm: AccountForm
  status: string
  onClose: () => void
  onAccountFieldChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onCreateAccount: (event: FormEvent<HTMLFormElement>) => void
}

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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Buscar cuenta Riot</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

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
      </div>
    </div>
  )
}
