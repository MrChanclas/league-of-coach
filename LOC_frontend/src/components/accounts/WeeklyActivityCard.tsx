import { WEEKDAY_LABELS, BAR_SCALE_PX } from '../../constants'
import { buildLastSevenDays } from '../../lib/accounts'
import type { WeeklyActivityCardProps } from '../../types/components'

export function WeeklyActivityCard({ activity }: WeeklyActivityCardProps) {
  const days = buildLastSevenDays(activity)
  const totalWins = days.reduce((sum, day) => sum + day.wins, 0)
  const totalLosses = days.reduce((sum, day) => sum + day.losses, 0)
  const totalHours = days.reduce((sum, day) => sum + day.minutesPlayed, 0) / 60

  return (
    <div className="side-card">
      <div className="side-card-label">ACTIVIDAD SEMANAL</div>

      <div className="weekly-bars">
        {days.map((day) => (
          <div
            key={day.date}
            className="weekly-bar-col"
            role="img"
            title={`${day.wins} victorias, ${day.losses} derrotas`}
            aria-label={`${WEEKDAY_LABELS[new Date(day.date).getUTCDay()]}: ${day.wins} victorias, ${day.losses} derrotas`}
          >
            <div className="weekly-bar-win" style={{ height: `${day.wins * BAR_SCALE_PX}px` }} />
            <div className="weekly-bar-loss" style={{ height: `${day.losses * BAR_SCALE_PX}px` }} />
          </div>
        ))}
      </div>

      <div className="weekly-labels">
        {days.map((day) => (
          <div key={day.date} className="weekly-label">
            {WEEKDAY_LABELS[new Date(day.date).getUTCDay()]}
          </div>
        ))}
      </div>

      <div className="weekly-footer">
        <div>
          <div className="weekly-footer-value" style={{ color: 'var(--hf-win-blue)' }}>
            {totalWins}
          </div>
          <div className="weekly-footer-sub">VICTORIAS</div>
        </div>
        <div>
          <div className="weekly-footer-value" style={{ color: 'var(--hf-loss)' }}>
            {totalLosses}
          </div>
          <div className="weekly-footer-sub">DERROTAS</div>
        </div>
        <div>
          <div className="weekly-footer-value" style={{ color: 'var(--hf-text-soft)' }}>
            {totalHours.toFixed(1)}h
          </div>
          <div className="weekly-footer-sub">EN JUEGO</div>
        </div>
      </div>
    </div>
  )
}
