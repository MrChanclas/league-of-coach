import { DUO_QUEUE_LABELS } from '../../constants'
import { formatRelativeTime } from '../../lib/hexforge'
import { DuoAccountChip } from './DuoAccountChip'
import type { DuoListProps } from '../../types/components'

export function DuoList({ duos, ddragonVersion, onOpen }: DuoListProps) {
  return (
    <section className="social-card">
      <div className="social-card-eyebrow">TUS DUOS</div>
      {duos.length === 0 ? (
        <p className="empty-state">
          Cuando alguien acepte tu solicitud, o tú aceptes una, el duo aparece aquí con su chat y sus estadísticas.
        </p>
      ) : (
        <div className="duo-list">
          {duos.map((duo) => (
            <button key={duo.id} type="button" className="duo-list-item" onClick={() => onOpen(duo.id)}>
              <DuoAccountChip account={duo.partner} ddragonVersion={ddragonVersion} />
              <div className="duo-list-preview">
                <span className="duo-muted">{DUO_QUEUE_LABELS[duo.queue]}</span>
                {duo.lastMessage ? (
                  <span className="duo-list-last">
                    {duo.lastMessage.mine ? 'Tú: ' : ''}
                    {duo.lastMessage.body} · {formatRelativeTime(duo.lastMessage.createdAt)}
                  </span>
                ) : (
                  <span className="duo-list-last">Sin mensajes todavía</span>
                )}
              </div>
              {duo.unread > 0 && <span className="duo-unread">{duo.unread}</span>}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
