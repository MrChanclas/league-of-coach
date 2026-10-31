import { DUO_QUEUE_LABELS } from '../../constants'
import { DuoAccountChip } from './DuoAccountChip'
import type { DuoRequestListProps } from '../../types/components'

export function DuoRequestList({ requests, ddragonVersion, onRespond }: DuoRequestListProps) {
  const { received, sent } = requests
  if (received.length === 0 && sent.length === 0) return null

  return (
    <section className="social-card">
      <div className="social-card-eyebrow">SOLICITUDES</div>

      {received.length > 0 && (
        <div className="duo-request-group">
          <h3>Recibidas</h3>
          {received.map((request) => (
            <div key={request.id} className="duo-request">
              <DuoAccountChip account={request.account} ddragonVersion={ddragonVersion} />
              <span className="duo-muted">{DUO_QUEUE_LABELS[request.queue]}</span>
              {request.message && <p className="duo-candidate-note">“{request.message}”</p>}
              <div className="duo-form-actions">
                <button type="button" className="primary-btn" onClick={() => onRespond(request.id, 'accept')}>
                  Aceptar
                </button>
                <button type="button" className="secondary-btn" onClick={() => onRespond(request.id, 'decline')}>
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sent.length > 0 && (
        <div className="duo-request-group">
          <h3>Enviadas</h3>
          {sent.map((request) => (
            <div key={request.id} className="duo-request">
              <DuoAccountChip account={request.account} ddragonVersion={ddragonVersion} />
              <span className="duo-muted">Esperando respuesta</span>
              <button type="button" className="link-btn" onClick={() => onRespond(request.id, 'cancel')}>
                Cancelar
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
