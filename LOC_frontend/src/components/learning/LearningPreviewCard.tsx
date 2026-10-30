import { getLessonBackingFigure, lessonCountLabel } from '../../lib/lessons'
import type { LearningPreviewCardProps } from '../../types/components'

export function LearningPreviewCard({ lessons, gamesAnalyzed, onOpenLesson, onGoToLearning }: LearningPreviewCardProps) {
  const [hero, ...rest] = lessons
  const rows = rest.slice(0, 3)

  return (
    <div className="learning-preview">
      <div className="learning-preview-head">
        <div>
          <div className="learning-preview-eyebrow">APRENDIZAJE</div>
          <h2>{lessons.length === 0 ? 'Sin lecciones pendientes' : lessonCountLabel(lessons.length)}</h2>
          <p>
            De tus últimas {gamesAnalyzed} partidas. Entra a la lección para ver la evidencia
            {lessons.some((lesson) => lesson.kind === 'champion') ? ' y la guía.' : '.'}
          </p>
        </div>
        <button type="button" className="primary-btn" onClick={onGoToLearning}>
          Ver aprendizaje
        </button>
      </div>

      <div className="learning-preview-body">
        {lessons.length === 0 ? (
          <p className="empty-state">
            Todavía no hay suficientes partidas para generar lecciones, o ya trabajaste todas las disponibles.
          </p>
        ) : (
          <>
            {hero && (
              <button type="button" className="learning-hero-row" onClick={() => onOpenLesson(0)}>
                <div className="learning-hero-row-main">
                  <div className="learning-hero-row-tags">
                    <span className="learning-priority-badge">PRIORIDAD ALTA</span>
                    <span className="lesson-tag">{hero.tag}</span>
                  </div>
                  <div className="learning-hero-row-title">{hero.title}</div>
                  <p className="learning-hero-row-why">{hero.body}</p>
                </div>
                {getLessonBackingFigure(hero) && (
                  <div className="learning-row-figure">
                    <span className="learning-row-figure-value">{getLessonBackingFigure(hero)!.value}</span>
                    <span className="learning-row-figure-label">{getLessonBackingFigure(hero)!.label}</span>
                  </div>
                )}
                <span className="learning-row-chevron">›</span>
              </button>
            )}

            {rows.map((lesson, index) => {
              const figure = getLessonBackingFigure(lesson)
              return (
                <button
                  type="button"
                  key={`${lesson.tag}-${lesson.title}`}
                  className="learning-compact-row"
                  onClick={() => onOpenLesson(index + 1)}
                >
                  <span className="lesson-tag learning-compact-row-tag">{lesson.tag}</span>
                  <span className="learning-compact-row-title">{lesson.title}</span>
                  {figure && (
                    <span className="learning-row-figure learning-row-figure--compact">
                      <span className="learning-row-figure-value">{figure.value}</span>
                      <span className="learning-row-figure-label">{figure.label}</span>
                    </span>
                  )}
                  <span className="learning-row-chevron">›</span>
                </button>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
