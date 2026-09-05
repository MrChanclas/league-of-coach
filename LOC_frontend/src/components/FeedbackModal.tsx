import { useState } from 'react'
import type { FormEvent } from 'react'
import { API_URL } from '../lib/api'

type FeedbackModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    setMessage('')
    setEmail('')
    setStatus('')
    onClose()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setStatus('Enviando...')

    try {
      const response = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, email }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.message ?? 'No se pudo enviar el feedback.')
      }

      setStatus('¡Gracias! Lo revisamos pronto.')
      setTimeout(handleClose, 1500)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo enviar el feedback.')
    } finally {
      setIsSubmitting(false)
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

          <button type="submit" className="primary-btn auth-submit" disabled={isSubmitting}>
            Enviar feedback
          </button>
        </form>

        {status && <p className="auth-status">{status}</p>}
      </div>
    </div>
  )
}
