import type { AccountCard, LessonCard } from '../types/dashboard'

type LearningTabPanelProps = {
  activeAccount?: AccountCard
  lessons: LessonCard[]
  gamesAnalyzed: number
}

const MEDIA_LABELS: Record<LessonCard['mediaType'], string> = {
  CLIP: 'clip de repetición',
  HEATMAP: 'mapa de calor',
  GOLD_GRAPH: 'gráfico de oro',
  MATCHUP_TABLE: 'tabla de matchups',
  SESSION_REPORT: 'gráfico de sesión',
}

export function LearningTabPanel({ activeAccount, lessons, gamesAnalyzed }: LearningTabPanelProps) {
  if (!activeAccount) {
    return (
      <div className="view-content">
        <div className="page-head">
          <div>
            <h1>Aprendizaje</h1>
            <p>Agregá una cuenta de Riot en la pestaña &quot;Cuentas&quot; para recibir lecciones basadas en tus partidas.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="view-content">
      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">
            BASADO EN LAS ÚLTIMAS {gamesAnalyzed} PARTIDAS DE {activeAccount.summoner.toUpperCase()}
          </div>
          <h1>Aprendizaje</h1>
        </div>
      </div>

      {lessons.length === 0 ? (
        <p className="empty-state">
          Todavía no hay suficientes partidas sincronizadas para generar lecciones. Sincronizá más partidas desde el
          encabezado para desbloquear tu primer análisis.
        </p>
      ) : (
        <div className="lessons-grid">
          {lessons.map((lesson) => (
            <article key={`${lesson.tag}-${lesson.title}`} className="lesson-card">
              <div className="lesson-media">
                <span>{MEDIA_LABELS[lesson.mediaType]}</span>
              </div>
              <div className="lesson-body">
                <div className="lesson-tag">{lesson.tag}</div>
                <div className="lesson-title">{lesson.title}</div>
                <p className="lesson-text">{lesson.body}</p>
                <div className="lesson-meta">{lesson.meta}</div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
