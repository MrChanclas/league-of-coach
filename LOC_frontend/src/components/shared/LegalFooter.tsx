import { RIOT_LEGAL_NOTICE } from '../../constants'
import type { LegalFooterProps } from '../../types/components'

/** Riot's required notice and the legal links. Deleting the account only appears with a session. */
export function LegalFooter({ onDeleteUser }: LegalFooterProps) {
  return (
    <footer className="legal-footer">
      <nav className="legal-footer-links" aria-label="Información legal">
        <a href="/terminos/" target="_blank" rel="noopener">
          Términos
        </a>
        <a href="/privacidad/" target="_blank" rel="noopener">
          Privacidad
        </a>
        {onDeleteUser && (
          <button type="button" className="legal-footer-danger" onClick={onDeleteUser}>
            Eliminar mi cuenta
          </button>
        )}
      </nav>
      <p lang="en">{RIOT_LEGAL_NOTICE}</p>
    </footer>
  )
}
