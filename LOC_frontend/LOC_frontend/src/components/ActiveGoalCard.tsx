import type { GoalItem } from '../types/dashboard'

type ActiveGoalCardProps = {
  goal: GoalItem | null
  onGoToGoals: () => void
}

export function ActiveGoalCard({ goal, onGoToGoals }: ActiveGoalCardProps) {
  if (!goal) {
    return (
      <div className="side-card side-card--goal">
        <div className="side-card-label">OBJETIVO ACTIVO</div>
        <p className="side-empty">Todavía no tenés objetivos en curso para esta cuenta.</p>
        <button type="button" className="goal-highlight-cta" onClick={onGoToGoals}>
          Crear un objetivo
        </button>
      </div>
    )
  }

  return (
    <div className="side-card side-card--goal">
      <div className="side-card-label">OBJETIVO ACTIVO</div>
      <div className="goal-highlight-title">{goal.title}</div>
      <div className="goal-highlight-progress">
        <div className="goal-highlight-track">
          <div className="goal-highlight-fill" style={{ width: `${goal.progress}%` }} />
        </div>
        <span className="goal-highlight-pct">{goal.progress}%</span>
      </div>
      {goal.deadline && (
        <div className="goal-highlight-note">
          Fecha límite: {new Date(goal.deadline).toLocaleDateString()}
        </div>
      )}
      <button type="button" className="goal-highlight-cta" onClick={onGoToGoals}>
        Ver todos los objetivos
      </button>
    </div>
  )
}
