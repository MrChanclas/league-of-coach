import { DetectedErrorsSection } from './DetectedErrorsSection'
import { LessonDetailView } from './LessonDetailView'
import { LessonMediaArt } from './LessonMediaArt'
import { LockedTabState } from '../shared/LockedTabState'
import { buildGoalPrefillFromFlag } from '../../lib/goalPrefill'
import { POOL_ROLE_LABELS } from '../../lib/poolLabels'
import type {
  AccountCard,
  AccountStatsSummary,
  BehaviorFlag,
  GoalPrefill,
  LessonCard,
  PoolView,
  RosterChampion,
} from '../../types/dashboard'

type LearningTabPanelProps = {
  activeAccount?: AccountCard
  lessons: LessonCard[]
  behaviorFlags: BehaviorFlag[]
  gamesAnalyzed: number
  ddragonVersion: string | null
  overallStats: AccountStatsSummary | null
  selectedIndex: number | null
  onSelectIndex: (index: number | null) => void
  hasPool: boolean
  poolView: PoolView | undefined
  championRoster: RosterChampion[]
  onGoToPoolChamp: () => void
  onCreateGoalFromFlag: (prefill: GoalPrefill) => void
}

const MEDIA_LABELS: Record<LessonCard['mediaType'], string> = {
  CLIP: 'clip de repetición',
  HEATMAP: 'mapa de calor',
  GOLD_GRAPH: 'gráfico de oro',
  MATCHUP_TABLE: 'tabla de matchups',
  SESSION_REPORT: 'gráfico de sesión',
}

export function LearningTabPanel({
  activeAccount,
  lessons,
  behaviorFlags,
  gamesAnalyzed,
  ddragonVersion,
  overallStats,
  selectedIndex,
  onSelectIndex,
  hasPool,
  poolView,
  championRoster,
  onGoToPoolChamp,
  onCreateGoalFromFlag,
}: LearningTabPanelProps) {
  if (!activeAccount) {
    return (
      <div className="view-content">
        <div className="page-head">
          <div>
            <h1>Aprendizaje</h1>
            <p>Agrega una cuenta de Riot en la pestaña &quot;Cuentas&quot; para recibir lecciones basadas en tus partidas.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!hasPool) {
    return (
      <LockedTabState
        title="Aprendizaje"
        body="Arma tu pool de campeones para que las lecciones se enfoquen en lo que realmente juegas, no en un promedio de todo tu historial."
        ctaLabel="Ir a Pool Champ"
        onCtaClick={onGoToPoolChamp}
      />
    )
  }

  if (selectedIndex != null && lessons[selectedIndex]) {
    return (
      <LessonDetailView
        lesson={lessons[selectedIndex]}
        lessonNumber={selectedIndex + 1}
        totalLessons={lessons.length}
        accountId={activeAccount.id}
        ddragonVersion={ddragonVersion}
        overallStats={overallStats}
        onBack={() => onSelectIndex(null)}
        onPrevious={() => onSelectIndex(Math.max(0, selectedIndex - 1))}
        onNext={() => onSelectIndex(Math.min(lessons.length - 1, selectedIndex + 1))}
        hasPrevious={selectedIndex > 0}
        hasNext={selectedIndex < lessons.length - 1}
      />
    )
  }

  // Aprendizaje solo lee la línea principal y la secundaria (sin fill): el
  // encabezado lo dice para que no se espere una lección de un rol autofill.
  const mainLines = [poolView?.roleProfile.primaryRole, poolView?.roleProfile.secondaryRole]
    .filter((role) => role != null)
    .map((role) => POOL_ROLE_LABELS[role].toUpperCase())

  return (
    <div className="view-content">
      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">
            {mainLines.length > 0
              ? `BASADO EN TUS PARTIDAS DE ${mainLines.join(' Y ')} (SIN FILL) · ${activeAccount.summoner.toUpperCase()}`
              : `BASADO EN LAS ÚLTIMAS ${gamesAnalyzed} PARTIDAS DE ${activeAccount.summoner.toUpperCase()}`}
          </div>
          <h1>Aprendizaje</h1>
        </div>
      </div>

      <DetectedErrorsSection
        flags={behaviorFlags}
        ddragonVersion={ddragonVersion}
        onCreateGoal={(flag) => buildGoalPrefillFromFlag(flag, poolView, championRoster)}
        onOpenGoalModal={onCreateGoalFromFlag}
      />

      {lessons.length === 0 ? (
        <p className="empty-state">
          Todavía no hay suficientes partidas sincronizadas para generar lecciones. Sincroniza más partidas desde el
          encabezado para desbloquear tu primer análisis.
        </p>
      ) : (
        <div className="lessons-grid">
          {lessons.map((lesson, index) => (
            <article
              key={`${lesson.tag}-${lesson.title}`}
              className="lesson-card lesson-card--clickable"
              onClick={() => onSelectIndex(index)}
            >
              <LessonMediaArt
                mediaType={lesson.mediaType}
                kind={lesson.kind}
                championKey={lesson.championKey}
                ddragonVersion={ddragonVersion}
                label={MEDIA_LABELS[lesson.mediaType]}
              />
              <div className="lesson-body">
                <div className="lesson-tag">{lesson.tag}</div>
                <div className="lesson-title">{lesson.title}</div>
                <p className="lesson-text">{lesson.body}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
