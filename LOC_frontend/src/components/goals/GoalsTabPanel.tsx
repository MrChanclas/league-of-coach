import type { GoalItem } from '../../types/dashboard'
import { GoalRow } from './GoalRow'

type GoalsTabPanelProps = {
  goalsByAccount: GoalItem[]
  onOpenGoalModal: () => void
  onDeleteGoal: (goalId: string) => void
  onGoToMatches: () => void
}

function daysUntil(deadline?: string | null): number | null {
  if (!deadline) return null
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  return days > 0 ? days : null
}

function sortGoals(goals: GoalItem[]): GoalItem[] {
  return [...goals].sort((a, b) => {
    const aCompleted = a.status === 'completed' ? 1 : 0
    const bCompleted = b.status === 'completed' ? 1 : 0
    if (aCompleted !== bCompleted) return aCompleted - bCompleted
    return b.progress - a.progress
  })
}

export function GoalsTabPanel({ goalsByAccount, onOpenGoalModal, onDeleteGoal, onGoToMatches }: GoalsTabPanelProps) {
  const sortedGoals = sortGoals(goalsByAccount)
  const daysRemaining = Math.min(
    ...goalsByAccount.map((goal) => daysUntil(goal.deadline) ?? Infinity),
  )

  const handleDeleteClick = (event: React.MouseEvent, goal: GoalItem) => {
    event.stopPropagation()
    if (window.confirm('¿Seguro que quieres eliminar este objetivo?')) {
      onDeleteGoal(goal.id)
    }
  }

  return (
    <div className="view-content">
      <div className="goals-panel">
        <div className="goals-panel-head">
          <div>
            <div className="page-head-eyebrow">TUS METAS</div>
            <h1 className="goals-panel-title">Objetivos</h1>
          </div>
          <div className="goals-panel-actions">
            {Number.isFinite(daysRemaining) && (
              <span className="goals-panel-days">{daysRemaining} DÍAS RESTANTES</span>
            )}
            {sortedGoals.length > 0 && (
              <button
                type="button"
                className="primary-btn goals-panel-add-btn"
                onClick={onOpenGoalModal}
                aria-label="Nuevo objetivo"
              >
                <span aria-hidden="true">+</span>
                <span className="goals-panel-add-btn-label">Nuevo objetivo</span>
              </button>
            )}
          </div>
        </div>

        {sortedGoals.length === 0 ? (
          <div className="goals-empty">
            <p>Todavía no tienes objetivos para esta cuenta. Definí una meta de rango, rol o campeón.</p>
            <button type="button" className="primary-btn" onClick={onOpenGoalModal}>
              + Nuevo objetivo
            </button>
          </div>
        ) : (
          sortedGoals.map((goal) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              onClick={onGoToMatches}
              onDelete={(event) => handleDeleteClick(event, goal)}
            />
          ))
        )}
      </div>
    </div>
  )
}
