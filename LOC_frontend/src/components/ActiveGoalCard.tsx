import type { GoalItem } from '../types/dashboard'
import { formatGoalGap, formatGoalPace, formatGoalTitle } from '../lib/goalLabels'

type ActiveGoalCardProps = {
  goal: GoalItem | null
  onGoToGoals: () => void
}

export function ActiveGoalCard({ goal, onGoToGoals }: ActiveGoalCardProps) {
  if (!goal) {
    return (
      <div className="side-card side-card--goal">
        <div className="side-card-label">OBJETIVO ACTIVO</div>
        <p className="side-empty">Todavía no tienes objetivos en curso para esta cuenta.</p>
        <button type="button" className="goal-highlight-cta" onClick={onGoToGoals}>
          Crear un objetivo
        </button>
      </div>
    )
  }

  const gap = formatGoalGap(goal)
  const pace = formatGoalPace(goal)

  return (
    <div className="side-card side-card--goal">
      <div className="side-card-label">OBJETIVO ACTIVO</div>
      <div className="goal-highlight-title">{formatGoalTitle(goal)}</div>
      <div className="goal-highlight-progress">
        <div className="goal-highlight-track">
          <div className="goal-highlight-fill" style={{ width: `${goal.progress}%` }} />
        </div>
        <span className="goal-highlight-pct">{gap.value}</span>
      </div>
      <div className="goal-highlight-note">
        {gap.label && <span>{gap.label} · </span>}
        {pace.action}
      </div>
      <button type="button" className="goal-highlight-cta" onClick={onGoToGoals}>
        Ver todos los objetivos
      </button>
    </div>
  )
}
