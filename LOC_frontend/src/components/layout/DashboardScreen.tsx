import { useState } from 'react'
import { AccountSearchModal } from '../accounts/AccountSearchModal'
import { AccountTabPanel } from '../accounts/AccountTabPanel'
import { CuentaTabPanel } from '../auth/CuentaTabPanel'
import { DashboardHeader } from './DashboardHeader'
import { DashboardSidebar } from './DashboardSidebar'
import { MobileTabBar } from './MobileTabBar'
import { GoalFormModal } from '../goals/GoalFormModal'
import { GoalsTabPanel } from '../goals/GoalsTabPanel'
import { LearningTabPanel } from '../learning/LearningTabPanel'
import { MatchesTabPanel } from '../matches/MatchesTabPanel'
import { FirstStepsChecklist } from '../onboarding/FirstStepsChecklist'
import { OnboardingTour } from '../onboarding/OnboardingTour'
import { PoolChampTabPanel } from '../poolchamp/PoolChampTabPanel'

import type { SubmitEvent } from 'react'
import type {
  AccountCard,
  AccountForm,
  AccountStatsSummary,
  ActivityDay,
  BehaviorFlag,
  GoalCreateInput,
  GoalItem,
  GoalPrefill,
  LaneEntry,
  LessonCard,
  MatchParticipantEntry,
  PoolRecommendation,
  PoolView,
  RankSnapshotEntry,
  ReplacePoolEntryInput,
  RosterChampion,
  StreakInfo,
  TabKey,
  TimeRange,
} from '../../types/dashboard'

type DashboardScreenProps = {
  isSignedIn: boolean
  userDisplayName: string
  userDisplayEmail: string
  activeTab: TabKey
  userAccounts: AccountCard[]
  currentAccountId: string
  activeAccount?: AccountCard
  goalsByAccount: GoalItem[]
  status: string
  isLoadingDashboard: boolean
  accountForm: AccountForm
  matches: MatchParticipantEntry[]
  statsSummary: AccountStatsSummary | null
  streak: StreakInfo | null
  lanes: LaneEntry[]
  weeklyActivity: ActivityDay[]
  rankHistory: RankSnapshotEntry[]
  lessons: LessonCard[]
  behaviorFlags: BehaviorFlag[]
  ddragonVersion: string | null
  timeRange: TimeRange
  isSyncing: boolean
  lastSyncedLabel: string
  championRoster: RosterChampion[]
  poolView: PoolView | undefined
  poolRecommendation: PoolRecommendation | undefined
  isPoolRecommendationLoading: boolean
  isSavingPool: boolean
  onSavePool: (entries: ReplacePoolEntryInput[]) => Promise<boolean>
  onAddPoolOutsider: (championKey: string) => void
  // undefined = todavía no se resolvió el usuario (no auto-abrir); null = resuelto
  // y nunca vio el onboarding (auto-abrir); string = ya lo vio/saltó.
  onboardingCompletedAt: string | null | undefined
  onCompleteOnboarding: () => void
  onTimeRangeChange: (range: TimeRange) => void
  onTabChange: (tab: TabKey) => void
  onLogout: () => void
  onSetCurrentAccountId: (id: string) => void
  onAccountFieldChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onCreateAccount: (event: SubmitEvent<HTMLFormElement>) => void
  onDeleteAccount: (accountId: string) => void
  onSyncMatches: () => void
  onCreateGoal: (input: GoalCreateInput) => Promise<boolean>
  onDeleteGoal: (goalId: string) => void
}

export function DashboardScreen({
  isSignedIn,
  userDisplayName,
  userDisplayEmail,
  activeTab,
  userAccounts,
  currentAccountId,
  activeAccount,
  goalsByAccount,
  status,
  isLoadingDashboard,
  accountForm,
  matches,
  statsSummary,
  streak,
  lanes,
  weeklyActivity,
  rankHistory,
  lessons,
  behaviorFlags,
  ddragonVersion,
  timeRange,
  isSyncing,
  lastSyncedLabel,
  championRoster,
  poolView,
  poolRecommendation,
  isPoolRecommendationLoading,
  isSavingPool,
  onSavePool,
  onAddPoolOutsider,
  onboardingCompletedAt,
  onCompleteOnboarding,
  onTimeRangeChange,
  onTabChange,
  onLogout,
  onSetCurrentAccountId,
  onAccountFieldChange,
  onCreateAccount,
  onDeleteAccount,
  onSyncMatches,
  onCreateGoal,
  onDeleteGoal,
}: DashboardScreenProps) {
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  // undefined = modal cerrado; null = abierto sin pre-llenado; GoalPrefill =
  // abierto con tipo/campos ya completados desde un error detectado.
  const [goalModalPrefill, setGoalModalPrefill] = useState<GoalPrefill | null | undefined>(undefined)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<number | null>(null)

  // Solo se evalúa una vez que poolView resolvió, para no mostrar un flash de
  // "bloqueado" mientras carga a una cuenta que sí tiene pool armado.
  const hasPool = poolView !== undefined && Boolean(poolView.pool)
  const lockedTabs: TabKey[] = poolView !== undefined && !hasPool ? ['aprendizaje', 'objetivos'] : []

  const handleOpenLesson = (index: number) => {
    setSelectedLessonIndex(index)
    onTabChange('aprendizaje')
  }

  const handleOpenChampionLesson = (championKey: string) => {
    const index = lessons.findIndex((lesson) => lesson.kind === 'champion' && lesson.championKey === championKey)
    if (index >= 0) handleOpenLesson(index)
  }

  // Se auto-abre una sola vez, apenas se confirma que el usuario nunca
  // completó/saltó el onboarding. Comparar contra el último valor visto (en
  // vez de un ref) para ajustar el estado durante el render, no en un efecto.
  const [lastSeenOnboardingFlag, setLastSeenOnboardingFlag] = useState(onboardingCompletedAt)
  if (onboardingCompletedAt !== lastSeenOnboardingFlag) {
    setLastSeenOnboardingFlag(onboardingCompletedAt)
    if (onboardingCompletedAt === null) setIsOnboardingOpen(true)
  }

  const handleCloseOnboarding = () => {
    setIsOnboardingOpen(false)
    onCompleteOnboarding()
  }

  const handleReplayOnboarding = () => {
    setIsOnboardingOpen(true)
  }

  const handleOpenAccountModal = () => {
    onTabChange('cuentas')
    setIsAccountModalOpen(true)
  }

  const navMeta = {
    cuentas: userAccounts.length,
    partidas: statsSummary?.gamesPlayed ?? matches.length,
    aprendizaje: lessons.length,
    'pool-champ': poolView?.entries.length ?? 0,
    objetivos: goalsByAccount.length,
  }

  // Estado real, no el paso del tour — ver handoff_loc/04-onboarding.md.
  // "Leer tu primera lección" no puede exigir lessons.length > 0: un jugador
  // sin nada que corregir nunca tiene lecciones y ese paso quedaría
  // trabado para siempre. Una vez que hay partidas cargadas, el motor de
  // lecciones ya corrió sobre ellas — haya encontrado algo o no, el paso
  // está resuelto.
  const checklistCompleted = [
    userAccounts.length > 0,
    (statsSummary?.gamesPlayed ?? 0) > 0,
    hasPool,
    lessons.length > 0 || (statsSummary?.gamesPlayed ?? 0) > 0,
    goalsByAccount.length > 0,
  ]

  if (!isSignedIn) {
    return <CuentaTabPanel />
  }

  return (
    <div className="forge-shell">
      <DashboardSidebar
        userDisplayName={userDisplayName}
        userDisplayEmail={userDisplayEmail}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onLogout={onLogout}
        userAccounts={userAccounts}
        currentAccountId={currentAccountId}
        onSetCurrentAccountId={onSetCurrentAccountId}
        onOpenAccountModal={handleOpenAccountModal}
        onReplayOnboarding={handleReplayOnboarding}
        navMeta={navMeta}
        lockedTabs={lockedTabs}
      />

      <main className="forge-main">
        <DashboardHeader
          userAccounts={userAccounts}
          currentAccountId={currentAccountId}
          activeAccount={activeAccount}
          onSetCurrentAccountId={onSetCurrentAccountId}
          onOpenAccountModal={handleOpenAccountModal}
          onSyncMatches={onSyncMatches}
          isSyncing={isSyncing}
          lastSyncedLabel={lastSyncedLabel}
        />

        {status && <p className="dashboard-status">{status}</p>}
        {isLoadingDashboard && <p className="dashboard-status">Cargando dashboard…</p>}

        {activeTab === 'cuentas' && (
          <AccountTabPanel
            userAccounts={userAccounts}
            activeAccount={activeAccount}
            currentAccountId={currentAccountId}
            ddragonVersion={ddragonVersion}
            statsSummary={statsSummary}
            streak={streak}
            lanes={lanes}
            rankHistory={rankHistory}
            weeklyActivity={weeklyActivity}
            goalsByAccount={goalsByAccount}
            lessons={lessons}
            timeRange={timeRange}
            checklistCompleted={checklistCompleted}
            championRoster={championRoster}
            hasChampionPool={hasPool}
            poolView={poolView}
            onTimeRangeChange={onTimeRangeChange}
            onSetCurrentAccountId={onSetCurrentAccountId}
            onDeleteAccount={onDeleteAccount}
            onGoToGoals={() => onTabChange('objetivos')}
            onGoToLearning={() => onTabChange('aprendizaje')}
            onGoToPoolChamp={() => onTabChange('pool-champ')}
            onOpenGoalModal={() => setGoalModalPrefill(null)}
            onOpenLesson={handleOpenLesson}
          />
        )}

        {activeTab === 'partidas' && (
          <MatchesTabPanel
            activeAccount={activeAccount}
            matches={matches}
            rankHistory={rankHistory}
            ddragonVersion={ddragonVersion}
          />
        )}

        {activeTab === 'aprendizaje' && (
          <LearningTabPanel
            activeAccount={activeAccount}
            lessons={lessons}
            behaviorFlags={behaviorFlags}
            gamesAnalyzed={statsSummary?.gamesPlayed ?? 0}
            ddragonVersion={ddragonVersion}
            overallStats={statsSummary}
            selectedIndex={selectedLessonIndex}
            onSelectIndex={setSelectedLessonIndex}
            hasPool={hasPool}
            poolView={poolView}
            championRoster={championRoster}
            onGoToPoolChamp={() => onTabChange('pool-champ')}
            onCreateGoalFromFlag={setGoalModalPrefill}
          />
        )}

        {activeTab === 'pool-champ' && (
          <PoolChampTabPanel
            activeAccount={activeAccount}
            poolView={poolView}
            roster={championRoster}
            ddragonVersion={ddragonVersion}
            lessons={lessons}
            recommendation={poolRecommendation}
            isRecommendationLoading={isPoolRecommendationLoading}
            isSavingPool={isSavingPool}
            onSavePool={onSavePool}
            onAddOutsider={onAddPoolOutsider}
            onOpenChampionLesson={handleOpenChampionLesson}
            onGoToAccounts={() => onTabChange('cuentas')}
          />
        )}

        {activeTab === 'objetivos' && (
          <GoalsTabPanel
            goalsByAccount={goalsByAccount}
            behaviorFlagsCount={behaviorFlags.length}
            hasPool={hasPool}
            onOpenGoalModal={() => setGoalModalPrefill(null)}
            onDeleteGoal={onDeleteGoal}
            onGoToMatches={() => onTabChange('partidas')}
            onGoToLearning={() => onTabChange('aprendizaje')}
            onGoToPoolChamp={() => onTabChange('pool-champ')}
          />
        )}
      </main>

      <AccountSearchModal
        isOpen={isAccountModalOpen}
        accountForm={accountForm}
        status={status}
        onClose={() => setIsAccountModalOpen(false)}
        onAccountFieldChange={onAccountFieldChange}
        onCreateAccount={onCreateAccount}
      />

      <GoalFormModal
        isOpen={goalModalPrefill !== undefined}
        accountId={activeAccount?.id ?? ''}
        status={status}
        prefill={goalModalPrefill ?? null}
        onClose={() => setGoalModalPrefill(undefined)}
        onSubmit={onCreateGoal}
      />

      <FirstStepsChecklist completed={checklistCompleted} />

      {isOnboardingOpen && (
        <OnboardingTour
          onClose={handleCloseOnboarding}
          onLoadMatches={() => {
            onTabChange('cuentas')
            onSyncMatches()
          }}
        />
      )}

      <MobileTabBar activeTab={activeTab} onTabChange={onTabChange} lockedTabs={lockedTabs} />
    </div>
  )
}
