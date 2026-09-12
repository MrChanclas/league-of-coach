import { useChampionGuide } from '../../hooks/useApiQueries'
import { getChampionIconUrl } from '../../lib/riotAssets'
import type { AccountStatsSummary, LessonCard } from '../../types/dashboard'

type LessonDetailViewProps = {
  lesson: LessonCard
  lessonNumber: number
  totalLessons: number
  accountId: string
  ddragonVersion: string | null
  overallStats: AccountStatsSummary | null
  onBack: () => void
  onPrevious: () => void
  onNext: () => void
  hasPrevious: boolean
  hasNext: boolean
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`
}

export function LessonDetailView({
  lesson,
  lessonNumber,
  totalLessons,
  accountId,
  ddragonVersion,
  overallStats,
  onBack,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: LessonDetailViewProps) {
  const isChampionLesson = lesson.kind === 'champion' && Boolean(lesson.championKey)
  const guideQuery = useChampionGuide(accountId, isChampionLesson ? lesson.championKey : undefined)

  const iconUrl =
    isChampionLesson && ddragonVersion ? getChampionIconUrl(lesson.championKey!, ddragonVersion) : null

  const belowAverage = (value: number | undefined, average: number | undefined) =>
    value != null && average != null && value < average

  return (
    <div className="view-content lesson-detail">
      <div className="detail-breadcrumb">
        <button type="button" className="detail-back" onClick={onBack}>
          ← Aprendizaje
        </button>
        <span className="detail-breadcrumb-sep">/</span>
        <span className="detail-breadcrumb-meta">
          LECCIÓN {lessonNumber} DE {totalLessons} · {lesson.tag}
        </span>
        <div className="detail-breadcrumb-nav">
          <button type="button" className="detail-nav-btn" onClick={onPrevious} disabled={!hasPrevious}>
            Anterior
          </button>
          <button type="button" className="detail-nav-btn" onClick={onNext} disabled={!hasNext}>
            Siguiente
          </button>
        </div>
      </div>

      <div className="diagnosis-band">
        <div className="diagnosis-head">
          {iconUrl ? (
            <img className="avatar-img avatar-img--xl" src={iconUrl} alt={lesson.championKey} />
          ) : (
            <div className="avatar-tile avatar-tile--xl">{lesson.tag.slice(0, 2)}</div>
          )}
          <div className="diagnosis-identity">
            <div className="diagnosis-tag">{lesson.tag}</div>
            <h1>{lesson.title}</h1>
          </div>
          {isChampionLesson && (
            <div className="diagnosis-stats">
              <div className="diagnosis-stat">
                <span className="diagnosis-stat-value">{lesson.championGamesPlayed ?? '—'}</span>
                <span className="diagnosis-stat-label">PARTIDAS</span>
              </div>
              <div className="diagnosis-stat">
                <span
                  className="diagnosis-stat-value"
                  style={{
                    color: belowAverage(lesson.championWinrate, overallStats?.winrate) ? 'var(--hf-loss)' : undefined,
                  }}
                >
                  {lesson.championWinrate != null ? pct(lesson.championWinrate) : '—'}
                </span>
                <span className="diagnosis-stat-label">WINRATE</span>
              </div>
              <div className="diagnosis-stat">
                <span
                  className="diagnosis-stat-value"
                  style={{
                    color: belowAverage(lesson.championAvgKda, overallStats?.avgKda) ? 'var(--hf-loss)' : undefined,
                  }}
                >
                  {lesson.championAvgKda != null ? lesson.championAvgKda.toFixed(2) : '—'}
                </span>
                <span className="diagnosis-stat-label">KDA</span>
              </div>
            </div>
          )}
        </div>

        <div className="diagnosis-why">
          <div className="diagnosis-why-label">POR QUÉ TE LA MARCAMOS</div>
          <p>{lesson.body}</p>
        </div>
      </div>

      {isChampionLesson && (
        <div className="guide-card">
          {guideQuery.isLoading && <p className="empty-state">Buscando la guía de {lesson.championKey}…</p>}

          {guideQuery.isError && (
            <p className="empty-state">Todavía no escribimos la guía de este campeón.</p>
          )}

          {guideQuery.data && (
            <>
              <div className="guide-header">
                <div className="guide-header-eyebrow">GUÍA ADJUNTA</div>
                <h2>Guía de {guideQuery.data.champion}</h2>
              </div>

              <div className="guide-facts">
                <div className="guide-fact">
                  <span className="guide-fact-label">ROL</span>
                  <span className="guide-fact-value">{guideQuery.data.content.role}</span>
                </div>
                <div className="guide-fact">
                  <span className="guide-fact-label">CLASE</span>
                  <span className="guide-fact-value">{guideQuery.data.content.championClass}</span>
                </div>
                <div className="guide-fact">
                  <span className="guide-fact-label">DIFICULTAD</span>
                  <span className="guide-fact-value guide-fact-value--gold">
                    {guideQuery.data.content.difficulty}
                  </span>
                </div>
              </div>

              <div className="guide-body">
                <p>{guideQuery.data.content.body}</p>
              </div>

              <div className="guide-tips">
                <div className="guide-tips-title">RECOMENDACIONES</div>
                <ul>
                  {guideQuery.data.content.tips.map((tip, index) => (
                    <li key={index} className={tip.warning ? 'guide-tip guide-tip--warning' : 'guide-tip'}>
                      <span className="guide-tip-marker" />
                      <span>
                        {tip.text}
                        {tip.warning && <span className="guide-tip-warning-line"> {tip.warning}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
