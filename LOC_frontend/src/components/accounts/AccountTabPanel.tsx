import { AccountBand } from './AccountBand'
import { AccountsGrid } from './AccountsGrid'
import { LearningPreviewCard } from '../learning/LearningPreviewCard'
import { ObjectivesPreviewCard } from '../goals/ObjectivesPreviewCard'
import { PoolChampMiniCard } from '../poolchamp/PoolChampMiniCard'
import { PoolChampPromoCard } from '../poolchamp/PoolChampPromoCard'
import { WeeklyActivityCard } from './WeeklyActivityCard'
import { FirstStepsChecklist } from '../onboarding/FirstStepsChecklist'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { POOL_ROLE_KEYS } from '../../lib/poolLabels'
import type {
  AccountCard,
  AccountStatsSummary,
  ActivityDay,
  GoalItem,
  LaneEntry,
  LessonCard,
  PoolRoleKey,
  PoolView,
  RankSnapshotEntry,
  RosterChampion,
  StreakInfo,
  TimeRange,
} from '../../types/dashboard'

function asPoolRoleKey(lane: string | undefined): PoolRoleKey | undefined {
  return lane && (POOL_ROLE_KEYS as string[]).includes(lane) ? (lane as PoolRoleKey) : undefined
}

type AccountTabPanelProps = {
  userAccounts: AccountCard[]
  activeAccount?: AccountCard
  currentAccountId: string
  ddragonVersion: string | null
  statsSummary: AccountStatsSummary | null
  streak: StreakInfo | null
  lanes: LaneEntry[]
  rankHistory: RankSnapshotEntry[]
  weeklyActivity: ActivityDay[]
  goalsByAccount: GoalItem[]
  lessons: LessonCard[]
  timeRange: TimeRange
  checklistCompleted: boolean[]
  championRoster: RosterChampion[]
  hasChampionPool: boolean
  poolView: PoolView | undefined
  onTimeRangeChange: (range: TimeRange) => void
  onSetCurrentAccountId: (id: string) => void
  onDeleteAccount: (accountId: string) => void
  onGoToGoals: () => void
  onGoToLearning: () => void
  onGoToPoolChamp: () => void
  onOpenGoalModal: () => void
  onOpenLesson: (index: number) => void
}

export function AccountTabPanel({
  userAccounts,
  activeAccount,
  currentAccountId,
  ddragonVersion,
  statsSummary,
  streak,
  lanes,
  weeklyActivity,
  goalsByAccount,
  lessons,
  timeRange,
  checklistCompleted,
  championRoster,
  hasChampionPool,
  poolView,
  onTimeRangeChange,
  onSetCurrentAccountId,
  onDeleteAccount,
  onGoToGoals,
  onGoToLearning,
  onGoToPoolChamp,
  onOpenGoalModal,
  onOpenLesson,
}: AccountTabPanelProps) {
  // Debajo de 1024px la barra lateral se reemplaza por la barra de pestañas
  // inferior: el widget "primeros pasos" pasa de flotante (choca con esa
  // barra) a ser el primer bloque del scroll de esta vista.
  const isMobileShell = useMediaQuery('(max-width: 1023.98px)')

  if (!activeAccount) {
    return (
      <div className="view-content">
        {isMobileShell && <FirstStepsChecklist completed={checklistCompleted} variant="inline" />}
        <div className="page-head">
          <div>
            <div className="page-head-eyebrow">BIENVENIDO</div>
            <h1>Vincula tu primera cuenta de Riot</h1>
            <p>Usa &quot;+ Vincular cuenta Riot&quot; en la barra lateral para empezar a ver tus estadísticas.</p>
          </div>
        </div>
        <AccountsGrid
          userAccounts={userAccounts}
          currentAccountId={currentAccountId}
          ddragonVersion={ddragonVersion}
          onSetCurrentAccountId={onSetCurrentAccountId}
          onDeleteAccount={onDeleteAccount}
        />
      </div>
    )
  }

  const primaryQueue: 'solo' | 'flex' = activeAccount.soloTier !== 'Unranked' ? 'solo' : 'flex'

  return (
    <div className="view-content">
      <div className="cuentas-view-4a">
        <div className="page-head">
          <div>
            <div className="page-head-eyebrow">BIENVENIDO DE VUELTA</div>
            <h1>Tu resumen</h1>
          </div>
          <div className="time-toggle">
            <button
              type="button"
              className={timeRange === '7d' ? 'time-toggle-btn active' : 'time-toggle-btn'}
              onClick={() => onTimeRangeChange('7d')}
            >
              7 días
            </button>
            <button
              type="button"
              className={timeRange === 'split' ? 'time-toggle-btn active' : 'time-toggle-btn'}
              onClick={() => onTimeRangeChange('split')}
            >
              Split
            </button>
          </div>
        </div>

        <AccountBand
          account={activeAccount}
          primaryQueue={primaryQueue}
          statsSummary={statsSummary}
          streak={streak}
          lanes={lanes}
        />

        <div className="coaching-grid">
          <div className="coaching-grid-main">
            <LearningPreviewCard
              lessons={lessons}
              gamesAnalyzed={statsSummary?.gamesPlayed ?? 0}
              onOpenLesson={onOpenLesson}
              onGoToLearning={onGoToLearning}
            />

            {hasChampionPool ? (
              <PoolChampMiniCard
                entries={poolView?.entries ?? []}
                mainRole={asPoolRoleKey(lanes[0]?.lane)}
                ddragonVersion={ddragonVersion}
                onGoToPoolChamp={onGoToPoolChamp}
              />
            ) : (
              <PoolChampPromoCard
                roster={championRoster}
                ddragonVersion={ddragonVersion}
                onArmarPool={onGoToPoolChamp}
                onVerDelCoach={onGoToPoolChamp}
              />
            )}
          </div>

          <div className="coaching-grid-aside">
            <ObjectivesPreviewCard goals={goalsByAccount} onGoToGoals={onGoToGoals} onOpenGoalModal={onOpenGoalModal} />
            <WeeklyActivityCard activity={weeklyActivity} />
          </div>
        </div>

        <AccountsGrid
          userAccounts={userAccounts}
          currentAccountId={currentAccountId}
          ddragonVersion={ddragonVersion}
          onSetCurrentAccountId={onSetCurrentAccountId}
          onDeleteAccount={onDeleteAccount}
        />
      </div>
    </div>
  )
}
