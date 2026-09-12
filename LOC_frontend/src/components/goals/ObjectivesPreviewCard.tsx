import { GoalRow } from './GoalRow'
import type { GoalItem } from '../../types/dashboard'

type ObjectivesPreviewCardProps = {
  goals: GoalItem[]
  onGoToGoals: () => void
  onOpenGoalModal: () => void
}

function daysUntil(deadline?: string | null): number | null {
  if (!deadline) return null
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  return days > 0 ? days : null
}

function openCountLabel(count: number) {
  if (count === 0) return 'Sin objetivos abiertos'
  if (count === 1) return 'Un objetivo abierto'
  return `${count} abiertos`
}

export function ObjectivesPreviewCard({ goals, onGoToGoals, onOpenGoalModal }: ObjectivesPreviewCardProps) {
  const openGoals = goals.filter((goal) => goal.status !== 'completed')
  const preview = [...openGoals].sort((a, b) => b.progress - a.progress).slice(0, 2)
  const daysRemaining = Math.min(...goals.map((goal) => daysUntil(goal.deadline) ?? Infinity))

  return (
    <div className="objectives-preview">
      <div className="objectives-preview-head">
        <div>
          <div className="objectives-preview-eyebrow">OBJETIVOS</div>
          <h2>{openCountLabel(openGoals.length)}</h2>
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
