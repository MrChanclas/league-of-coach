import type { GoalItem } from '../../types/dashboard'
import { KIND_LABELS, formatGoalCurrent, formatGoalGap, formatGoalPace, formatGoalTitle } from '../../lib/goalLabels'

type GoalRowProps = {
  goal: GoalItem
  onClick: () => void
  onDelete?: (event: React.MouseEvent) => void
}

const STATUS_LABELS: Record<GoalItem['status'], string> = {
  completed: 'COMPLETADO',
  in_progress: 'EN CURSO',
  behind: 'ATRASADO',
}

export function GoalRow({ goal, onClick, onDelete }: GoalRowProps) {
  const gap = formatGoalGap(goal)
  const pace = formatGoalPace(goal)
  const missingData = goal.status !== 'completed' && goal.pace == null

  return (
    <div className="goal-row" onClick={onClick} role="button" tabIndex={0}>
      <div className="goal-row-type">
        <div className="goal-row-kind">{KIND_LABELS[goal.type]}</div>
        <span className={`goal-status-badge goal-status-badge--${goal.status}`}>{STATUS_LABELS[goal.status]}</span>
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
