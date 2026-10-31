import { useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DUO_MESSAGE_MAX, queryKeys } from '../../constants'
import { useDuoMessages, useMarkDuoReadMutation, useSendDuoMessageMutation } from '../../hooks/useSocial'
import { mergeMessages } from '../../lib/social'
import type { DuoChatProps } from '../../types/components'
import type { DuoMessage } from '../../types/social'

export function DuoChat({ duoId, isEnded, partnerName }: DuoChatProps) {
  const queryClient = useQueryClient()
  const messagesQuery = useDuoMessages(duoId, !isEnded)
  const sendMutation = useSendDuoMessageMutation()
  const markReadMutation = useMarkDuoReadMutation()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const messages = messagesQuery.data ?? []
  const newestId = messages.at(-1)?.id
  const { mutate: markRead } = markReadMutation

  // Keeps the newest message in view and marks the chat as read whenever
  // something new shows up while it's open.
  useEffect(() => {
    if (!newestId) return
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
    markRead(duoId, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.socialSummary() })
        void queryClient.invalidateQueries({ queryKey: queryKeys.socialDuos() })
      },
    })
  }, [newestId, duoId, markRead, queryClient])

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return
    setError('')
    try {
      const sent = await sendMutation.mutateAsync({ duoId, body })
      setDraft('')
      queryClient.setQueryData<DuoMessage[]>(queryKeys.socialMessages(duoId), (current) =>
        mergeMessages(current ?? [], [sent]),
      )
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'No se pudo enviar el mensaje.')
    }
  }

  return (
    <section className="social-card duo-chat">
      <div className="social-card-eyebrow">CHAT</div>
      <div className="duo-chat-messages" ref={listRef}>
        {messages.length === 0 && (
          <p className="duo-muted">Escríbele a {partnerName} para coordinar cuándo juegan.</p>
        )}
        {messages.map((message) => (
          <div key={message.id} className={message.mine ? 'duo-message duo-message--mine' : 'duo-message'}>
            <p>{message.body}</p>
            <time dateTime={message.createdAt}>
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </time>
          </div>
        ))}
      </div>

      {isEnded ? (
        <p className="duo-muted">Este duo terminó; el chat queda solo para lectura.</p>
      ) : (
        <form className="duo-chat-form" onSubmit={(event) => void handleSubmit(event)}>
          <input
            value={draft}
            maxLength={DUO_MESSAGE_MAX}
            placeholder="Escribe un mensaje"
            aria-label="Mensaje"
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="primary-btn" disabled={!draft.trim() || sendMutation.isPending}>
            Enviar
          </button>
        </form>
      )}
      {error && <p className="social-error">{error}</p>}
    </section>
  )
}
