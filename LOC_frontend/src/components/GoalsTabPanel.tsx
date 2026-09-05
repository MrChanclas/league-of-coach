import type { GoalItem, GoalStatus, GoalType } from '../types/dashboard'

type GoalsTabPanelProps = {
  goalsByAccount: GoalItem[]
}

const KIND_LABELS: Record<GoalType, string> = {
  rank: 'RANGO',
  consistency: 'CONSISTENCIA',
  mechanic: 'MECÁNICA',
  habit: 'HÁBITO',
}

const STATUS_LABELS: Record<GoalStatus, string> = {
  completed: 'COMPLETADO',
  in_progress: 'EN CURSO',
  behind: 'ATRASADO',
}

export function GoalsTabPanel({ goalsByAccount }: GoalsTabPanelProps) {
  return (
    <div className="view-content">
      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">TUS METAS</div>
          <h1>Objetivos</h1>
        </div>
      </div>

      {goalsByAccount.length === 0 ? (
        <p className="empty-state">No hay objetivos para la cuenta seleccionada todavía.</p>
      ) : (
        <div className="goals-grid">
          {goalsByAccount.map((goal) => (
            <article key={goal.id} className="goal-card">
              <div className="goal-card-head">
                <span className="goal-card-kind">{KIND_LABELS[goal.type]}</span>
                <span className={`goal-status-badge goal-status-badge--${goal.status}`}>
                  {STATUS_LABELS[goal.status]}
                </span>
              </div>
              <div className="goal-card-title">{goal.title}</div>
              {goal.deadline && (
                <p className="goal-card-note">Fecha límite: {new Date(goal.deadline).toLocaleDateString()}</p>
              )}
              <div className="goal-card-progress">
                <div className="goal-card-track">
                  <div
                    className={`goal-card-fill goal-card-fill--${goal.status}`}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                <span className="goal-card-pct">{goal.progress}%</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
