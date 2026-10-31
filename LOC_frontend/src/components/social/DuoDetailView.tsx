import { useQueryClient } from '@tanstack/react-query'
import { DUO_QUEUE_LABELS, DUO_REPORT_REASON_MAX, queryKeys } from '../../constants'
import {
  useDuoDetail,
  useEndDuoMutation,
  useRemoveDuoGoalMutation,
  useReportDuoMutation,
  useSetDuoGoalMutation,
} from '../../hooks/useSocial'
import { formatPercent } from '../../lib/lessons'
import { formatRelativeTime } from '../../lib/hexforge'
import { DuoAccountChip } from './DuoAccountChip'
import { DuoChat } from './DuoChat'
import { DuoGoalCard } from './DuoGoalCard'
import type { DuoDetailViewProps } from '../../types/components'
import type { DuoGoalInput } from '../../types/social'

export function DuoDetailView({ duoId, ddragonVersion, onBack, onStatus }: DuoDetailViewProps) {
  const queryClient = useQueryClient()
  const detailQuery = useDuoDetail(duoId)
  const setGoalMutation = useSetDuoGoalMutation()
  const removeGoalMutation = useRemoveDuoGoalMutation()
  const endMutation = useEndDuoMutation()
  const reportMutation = useReportDuoMutation()

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.social() })

  const run = async (action: () => Promise<unknown>, success: string, failure: string) => {
    try {
      await action()
      await refresh()
      onStatus(success)
    } catch (error) {
      onStatus(error instanceof Error ? error.message : failure)
    }
  }

  const detail = detailQuery.data
  if (!detail) {
    return (
      <div className="view-content">
        <button type="button" className="link-btn" onClick={onBack}>
          ← Volver a Social
        </button>
        <p className="empty-state">{detailQuery.isError ? 'No se pudo cargar este duo.' : 'Cargando duo…'}</p>
      </div>
    )
  }

  const isEnded = Boolean(detail.endedAt)
  const { allTime, sinceDuo, recent } = detail.stats

  const handleSaveGoal = (input: DuoGoalInput) =>
    void run(() => setGoalMutation.mutateAsync({ duoId, input }), 'Objetivo del duo guardado.', 'No se pudo guardar el objetivo.')

  const handleEnd = () => {
    if (!window.confirm(`¿Terminar el duo con ${detail.partner.summoner}? El chat queda solo para lectura.`)) return
    void run(() => endMutation.mutateAsync(duoId), 'Duo terminado.', 'No se pudo terminar el duo.')
  }

  const handleReport = () => {
    const reason = window.prompt(
      `¿Qué pasó con ${detail.partner.summoner}? El reporte llega al equipo de LoC y el duo se termina.`,
    )
    if (!reason?.trim()) return
    void run(
      () => reportMutation.mutateAsync({ duoId, reason: reason.trim().slice(0, DUO_REPORT_REASON_MAX) }),
      'Reporte enviado. Gracias por avisarnos.',
      'No se pudo enviar el reporte.',
    )
  }

  return (
    <div className="view-content">
      <button type="button" className="link-btn" onClick={onBack}>
        ← Volver a Social
      </button>

      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">DUO · {DUO_QUEUE_LABELS[detail.queue].toUpperCase()}</div>
          <h1>Tú y {detail.partner.summoner}</h1>
          <p>
            {isEnded ? 'Duo terminado.' : `Duo desde ${new Date(detail.createdAt).toLocaleDateString()}.`}
            {detail.partner.discordUsername
              ? ` Su Discord: ${detail.partner.discordUsername}.`
              : ' No vinculó Discord: coordinen por el chat.'}
          </p>
        </div>
        {!isEnded && (
          <div className="duo-form-actions">
            <button type="button" className="secondary-btn" onClick={handleEnd}>
              Terminar duo
            </button>
            <button type="button" className="link-btn" onClick={handleReport}>
              Reportar
            </button>
          </div>
        )}
      </div>

      <div className="duo-detail-grid">
        <div className="duo-detail-main">
          <section className="social-card">
            <div className="social-card-eyebrow">JUGANDO JUNTOS</div>
            <div className="duo-pair">
              <DuoAccountChip account={detail.me} ddragonVersion={ddragonVersion} />
              <DuoAccountChip account={detail.partner} ddragonVersion={ddragonVersion} />
            </div>
            <div className="duo-stats">
              <div>
                <div className="duo-stat-value">{allTime.games}</div>
                <div className="duo-stat-label">PARTIDAS JUNTOS</div>
              </div>
              <div>
                <div className="duo-stat-value">{allTime.games ? formatPercent(allTime.winrate) : '—'}</div>
                <div className="duo-stat-label">WINRATE JUNTOS</div>
              </div>
              <div>
                <div className="duo-stat-value">
                  {sinceDuo.wins}V · {sinceDuo.games - sinceDuo.wins}D
                </div>
                <div className="duo-stat-label">DESDE QUE SON DUO</div>
              </div>
            </div>
            {recent.length === 0 ? (
              <p className="duo-muted">
                Todavía no hay partidas juntos en {DUO_QUEUE_LABELS[detail.queue]}. Aparecen al sincronizar tras jugar.
              </p>
            ) : (
              <div className="duo-games">
                {recent.map((game) => (
                  <div key={game.matchId} className={game.win ? 'duo-game duo-game--win' : 'duo-game duo-game--loss'}>
                    <span className="duo-game-result">{game.win ? 'Victoria' : 'Derrota'}</span>
                    <span>
                      {game.me.champion} ({game.me.kda.toFixed(1)}) + {game.partner.champion} (
                      {game.partner.kda.toFixed(1)})
                    </span>
                    <span className="duo-muted">{formatRelativeTime(game.playedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <DuoGoalCard
            detail={detail}
            isSaving={setGoalMutation.isPending}
            onSave={handleSaveGoal}
            onRemove={() =>
              void run(() => removeGoalMutation.mutateAsync(duoId), 'Objetivo quitado.', 'No se pudo quitar el objetivo.')
            }
          />
        </div>

        <DuoChat duoId={duoId} isEnded={isEnded} partnerName={detail.partner.summoner} />
      </div>
    </div>
  )
}
