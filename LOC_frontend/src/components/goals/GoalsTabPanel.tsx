import type { GoalItem } from '../../types/dashboard'
import { KIND_LABELS, formatGoalCurrent, formatGoalGap, formatGoalPace, formatGoalTitle } from '../../lib/goalLabels'

type GoalsTabPanelProps = {
  goalsByAccount: GoalItem[]
  onOpenGoalModal: () => void
  onDeleteGoal: (goalId: string) => void
  onGoToMatches: () => void
}

const STATUS_LABELS: Record<GoalItem['status'], string> = {
  completed: 'COMPLETADO',
  in_progress: 'EN CURSO',
  behind: 'ATRASADO',
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
              <button type="button" className="primary-btn" onClick={onOpenGoalModal}>
                + Nuevo objetivo
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
          sortedGoals.map((goal) => {
            const gap = formatGoalGap(goal)
            const pace = formatGoalPace(goal)
            const missingData = goal.status !== 'completed' && goal.pace == null

            return (
              <div key={goal.id} className="goal-row" onClick={onGoToMatches} role="button" tabIndex={0}>
                <div className="goal-row-type">
                  <div className="goal-row-kind">{KIND_LABELS[goal.type]}</div>
                  <span className={`goal-status-badge goal-status-badge--${goal.status}`}>
                    {STATUS_LABELS[goal.status]}
                  </span>
                </div>

                <div className="goal-row-main">
                  <div className="goal-row-title">{formatGoalTitle(goal)}</div>
                  <div className="goal-row-current">{formatGoalCurrent(goal)}</div>
                  <div className="goal-row-track">
                    <div
                      className={`goal-row-fill goal-row-fill--${goal.status}`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>

                <div className="goal-row-gap">
                  <div className={`goal-row-gap-value goal-row-gap-value--${goal.status}`}>{gap.value}</div>
                  <div className="goal-row-gap-label">{gap.label}</div>
                </div>

                <div className="goal-row-pace">
                  <div className={missingData ? 'goal-row-pace-action goal-row-pace-action--muted' : 'goal-row-pace-action'}>
                    {pace.action}
                  </div>
                  <div className="goal-row-pace-context">{pace.context}</div>
                </div>

                <span
                  className="goal-row-menu"
                  role="button"
                  tabIndex={0}
                  aria-label="Eliminar objetivo"
                  title="Eliminar objetivo"
                  onClick={(event) => handleDeleteClick(event, goal)}
                >
                  ⋯
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
