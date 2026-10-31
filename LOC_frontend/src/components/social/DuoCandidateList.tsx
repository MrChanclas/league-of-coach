import { useState } from 'react'
import { DUO_REQUEST_MESSAGE_MAX } from '../../constants'
import { describeMatch, formatAvailability, formatRoles } from '../../lib/social'
import { DuoAccountChip } from './DuoAccountChip'
import type { DuoCandidateListProps } from '../../types/components'

export function DuoCandidateList({
  candidates,
  ddragonVersion,
  isLoading,
  sendingTo,
  onSendRequest,
}: DuoCandidateListProps) {
  // Only one composer open at a time.
  const [composingFor, setComposingFor] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const openComposer = (userId: string) => {
    setComposingFor(userId)
    setMessage('')
  }

  return (
    <section className="social-card">
      <div className="social-card-head">
        <div>
          <div className="social-card-eyebrow">CANDIDATOS</div>
          <h2>Jugadores compatibles</h2>
          <p className="social-card-sub">
            Mismo servidor y cola, con rangos que Riot deja jugar juntos. Primero los que mejor encajan con tu línea y
            tu objetivo.
          </p>
        </div>
      </div>

      {isLoading && <p className="empty-state">Buscando jugadores…</p>}
      {!isLoading && candidates.length === 0 && (
        <p className="empty-state">
          Todavía no hay jugadores compatibles buscando duo. Vuelve más tarde: la lista se actualiza cuando alguien activa
          su perfil.
        </p>
      )}

      <div className="duo-candidates">
        {candidates.map((candidate) => {
          const reasons = describeMatch(candidate)
          const isComposing = composingFor === candidate.userId
          return (
            <article key={candidate.userId} className="duo-candidate">
              <div className="duo-candidate-main">
                <DuoAccountChip account={candidate.account} ddragonVersion={ddragonVersion} />
                <div className="duo-candidate-meta">
                  <span>Juega {formatRoles(candidate.roles)}</span>
                  <span>Busca {formatRoles(candidate.lookingFor)}</span>
                  {candidate.availability.length > 0 && <span>{formatAvailability(candidate.availability)}</span>}
                </div>
                {candidate.note && <p className="duo-candidate-note">“{candidate.note}”</p>}
                {reasons.length > 0 && (
                  <div className="duo-reasons">
                    {reasons.map((reason) => (
                      <span key={reason} className="duo-reason">
                        {reason}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="duo-candidate-action">
                {candidate.pendingRequest === 'sent' && <span className="duo-muted">Solicitud enviada</span>}
                {candidate.pendingRequest === 'received' && (
                  <span className="duo-muted">Te envió una solicitud</span>
                )}
                {!candidate.pendingRequest && !isComposing && (
                  <button type="button" className="secondary-btn" onClick={() => openComposer(candidate.userId)}>
                    Proponer duo
                  </button>
                )}
              </div>

              {isComposing && (
                <form
                  className="duo-composer"
                  onSubmit={(event) => {
                    event.preventDefault()
                    onSendRequest(candidate.userId, message.trim())
                    setComposingFor(null)
                  }}
                >
                  <textarea
                    value={message}
                    maxLength={DUO_REQUEST_MESSAGE_MAX}
                    rows={2}
                    placeholder="Preséntate en una línea (opcional)."
                    onChange={(event) => setMessage(event.target.value)}
                  />
                  <div className="duo-form-actions">
                    <button type="submit" className="primary-btn" disabled={sendingTo === candidate.userId}>
                      Enviar solicitud
                    </button>
                    <button type="button" className="secondary-btn" onClick={() => setComposingFor(null)}>
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
