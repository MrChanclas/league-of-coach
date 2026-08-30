import type { DashboardSummary } from '../types/dashboard'

type DashboardStatsGridProps = {
  summary: DashboardSummary
}

export function DashboardStatsGrid({ summary }: DashboardStatsGridProps) {
  return (
    <>
      <div className="insight-row">
        <article className="insight-tile">
          <span>Foco</span>
          <strong>{summary.activeFocus || 'Sin foco'}</strong>
          <small>rol principal</small>
        </article>
        <article className="insight-tile">
          <span>Sesiones</span>
          <strong>{summary.totalLearnings}</strong>
          <small>esta semana</small>
        </article>
        <article className="insight-tile">
          <span>Meta</span>
          <strong>
            {summary.totalAccounts > 0
              ? Math.round((summary.totalGoals / summary.totalAccounts) * 100)
              : 0}
            %
          </strong>
          <small>progreso general</small>
        </article>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span>Cuentas</span>
          <strong>{summary.totalAccounts}</strong>
          <small>Activas</small>
        </article>
        <article className="stat-card">
          <span>Objetivos</span>
          <strong>{summary.totalGoals}</strong>
          <small>Personales</small>
        </article>
        <article className="stat-card">
          <span>Aprendizaje</span>
          <strong>{summary.totalLearnings}</strong>
          <small>Campeones</small>
        </article>
        <article className="stat-card focus">
          <span>Foco actual</span>
          <strong>{summary.activeFocus || 'Sin foco'}</strong>
          <small>En revisión</small>
        </article>
      </div>
    </>
  )
}
