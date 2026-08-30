import type { GoalItem } from '../types/dashboard'

type GoalsTabPanelProps = {
  goalsByAccount: GoalItem[]
}

export function GoalsTabPanel({ goalsByAccount }: GoalsTabPanelProps) {
  return (
    <section className="panel-block">
      <div className="panel-header">
        <h3>Objetivos personales</h3>
        <span>Meta mensual</span>
      </div>

      <div className="stack-list">
        {goalsByAccount.length === 0 ? (
          <p>No hay objetivos para la cuenta seleccionada todavía.</p>
        ) : (
          goalsByAccount.map((goal) => (
            <article key={goal.id} className="info-card goal-card">
              <div className="goal-topline">
                <span className={goal.type === 'rank' ? 'chip chip-gold' : goal.type === 'role' ? 'chip chip-teal' : 'chip chip-red'}>
                  {goal.type === 'rank' ? 'Rango' : goal.type === 'role' ? 'Rol' : 'Campeón'}
                </span>
                <h4>{goal.title}</h4>
              </div>

              <div className="goal-meta">
                <strong>{goal.progress}%</strong>
                <span>{goal.deadline || 'Sin fecha'}</span>
              </div>

              <div className="progress-bar">
                <div style={{ width: `${goal.progress}%` }} />
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
