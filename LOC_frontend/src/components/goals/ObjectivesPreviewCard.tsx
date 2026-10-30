import { GoalRow } from './GoalRow'
import { daysUntil } from '../../lib/dates'
import { openGoalsCountLabel } from '../../lib/goalLabels'
import type { ObjectivesPreviewCardProps } from '../../types/components'

export function ObjectivesPreviewCard({ goals, onGoToGoals, onOpenGoalModal }: ObjectivesPreviewCardProps) {
  const openGoals = goals.filter((goal) => goal.status !== 'completed')
  const preview = [...openGoals].sort((a, b) => b.progress - a.progress).slice(0, 2)
  const daysRemaining = Math.min(...goals.map((goal) => daysUntil(goal.deadline) ?? Infinity))

  return (
    <div className="objectives-preview">
      <div className="objectives-preview-head">
        <div>
          <div className="objectives-preview-eyebrow">OBJETIVOS</div>
          <h2>{openGoalsCountLabel(openGoals.length)}</h2>
        </div>
        {Number.isFinite(daysRemaining) && <span className="objectives-preview-days">{daysRemaining} DÍAS</span>}
      </div>

      <div className="objectives-preview-body">
        {preview.length === 0 ? (
          <p className="empty-state">Todavía no tienes objetivos para esta cuenta.</p>
        ) : (
          preview.map((goal) => <GoalRow key={goal.id} goal={goal} onClick={onGoToGoals} />)
        )}
      </div>

      <div className="objectives-preview-actions">
        <button type="button" className="objectives-preview-primary" onClick={onGoToGoals}>
          Ver objetivos
        </button>
        <button type="button" className="objectives-preview-ghost" onClick={onOpenGoalModal}>
          + Nuevo
        </button>
      </div>
    </div>
  )
}
