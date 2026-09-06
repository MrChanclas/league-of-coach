import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { useSubmitFeedbackMutation } from '../../hooks/useApiMutations'

type FeedbackModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const submitFeedbackMutation = useSubmitFeedbackMutation()

  if (!isOpen) return null

  const handleClose = () => {
    setMessage('')
    setEmail('')
    setStatus('')
    onClose()
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('Enviando...')

    try {
      await submitFeedbackMutation.mutateAsync({ message, email })
      setStatus('¡Gracias! Lo revisamos pronto.')
      setTimeout(handleClose, 1500)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo enviar el feedback.')
    }
  }

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Dejanos tu feedback</h3>
          <button type="button" className="modal-close" onClick={handleClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Mensaje
            <textarea
              name="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Contanos qué te gustaría mejorar o qué problema encontraste"
              rows={4}
              maxLength={2000}
              required
            />
          </label>
          <label>
            Email (opcional)
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Para responderte, si querés"
            />
          </label>

          <button type="submit" className="primary-btn auth-submit" disabled={submitFeedbackMutation.isPending}>
            Enviar feedback
          </button>
        </form>

        {status && <p className="auth-status">{status}</p>}
      </div>
    </div>
  )
}
