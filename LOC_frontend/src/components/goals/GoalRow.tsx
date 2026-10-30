import { GOAL_STATUS_LABELS, KIND_LABELS } from '../../constants'
import { formatGoalCurrent, formatGoalGap, formatGoalPace, formatGoalTitle } from '../../lib/goalLabels'
import type { GoalRowProps } from '../../types/components'

export function GoalRow({ goal, onClick, onDelete }: GoalRowProps) {
  const gap = formatGoalGap(goal)
  const pace = formatGoalPace(goal)
  const missingData = goal.status !== 'completed' && goal.pace == null

  return (
    <div className="goal-row" onClick={onClick} role="button" tabIndex={0}>
      <div className="goal-row-type">
        <div className="goal-row-kind">{KIND_LABELS[goal.type]}</div>
        <span className={`goal-status-badge goal-status-badge--${goal.status}`}>{GOAL_STATUS_LABELS[goal.status]}</span>
      </div>

      <div className="goal-row-main">
        <div className="goal-row-title">{formatGoalTitle(goal)}</div>
        <div className="goal-row-current">{formatGoalCurrent(goal)}</div>
        <div className="goal-row-track">
          <div className={`goal-row-fill goal-row-fill--${goal.status}`} style={{ width: `${goal.progress}%` }} />
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

      {onDelete && (
        <span
          className="goal-row-menu"
          role="button"
          tabIndex={0}
          aria-label="Eliminar objetivo"
          title="Eliminar objetivo"
          onClick={onDelete}
        >
          ⋯
        </span>
      )}
    </div>
  )
}
