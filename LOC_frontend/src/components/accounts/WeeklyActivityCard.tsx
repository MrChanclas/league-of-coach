import type { ActivityDay } from '../../types/dashboard'

const WEEKDAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const BAR_SCALE_PX = 26

function buildLastSevenDays(activity: ActivityDay[]): ActivityDay[] {
  const byDate = new Map(activity.map((day) => [day.date, day]))
  const days: ActivityDay[] = []

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - offset)
    const key = date.toISOString().slice(0, 10)
    days.push(byDate.get(key) ?? { date: key, wins: 0, losses: 0, minutesPlayed: 0 })
  }

  return days
}

export function WeeklyActivityCard({ activity }: { activity: ActivityDay[] }) {
  const days = buildLastSevenDays(activity)
  const totalWins = days.reduce((sum, day) => sum + day.wins, 0)
  const totalLosses = days.reduce((sum, day) => sum + day.losses, 0)
  const totalHours = days.reduce((sum, day) => sum + day.minutesPlayed, 0) / 60

  return (
    <div className="side-card">
      <div className="side-card-label">ACTIVIDAD SEMANAL</div>

      <div className="weekly-bars">
        {days.map((day) => (
          <div key={day.date} className="weekly-bar-col">
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
          <div className="weekly-footer-value" style={{ color: '#e0dbcf' }}>
            {totalHours.toFixed(1)}h
          </div>
          <div className="weekly-footer-sub">EN JUEGO</div>
        </div>
      </div>
    </div>
  )
}
