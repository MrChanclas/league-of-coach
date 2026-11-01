import { Suspense, lazy, useState } from 'react'
import { AccountSearchModal } from '../accounts/AccountSearchModal'
import { AccountTabPanel } from '../accounts/AccountTabPanel'
import { AccountVerificationModal } from '../accounts/AccountVerificationModal'
import { CuentaTabPanel } from '../auth/CuentaTabPanel'
import { DashboardHeader } from './DashboardHeader'
import { DashboardSidebar } from './DashboardSidebar'
import { MobileTabBar } from './MobileTabBar'
import { TwitchLiveBanner } from './TwitchLiveBanner'
import { GoalFormModal } from '../goals/GoalFormModal'
import { FirstStepsChecklist } from '../onboarding/FirstStepsChecklist'
import { OnboardingTour } from '../onboarding/OnboardingTour'
import { LegalFooter } from '../shared/LegalFooter'
import { LockedTabState } from '../shared/LockedTabState'
import { useSocialSummary } from '../../hooks/useSocial'

import type {
  GoalPrefill,
  PoolSlotKey,
  TabKey,
} from '../../types/dashboard'
import type { DashboardScreenProps } from '../../types/components'

// Every tab past the home loads on demand, so opening the app doesn't download them all.
const GoalsTabPanel = lazy(() => import('../goals/GoalsTabPanel').then((module) => ({ default: module.GoalsTabPanel })))
const LearningTabPanel = lazy(() =>
  import('../learning/LearningTabPanel').then((module) => ({ default: module.LearningTabPanel })),
)
const MatchesTabPanel = lazy(() =>
  import('../matches/MatchesTabPanel').then((module) => ({ default: module.MatchesTabPanel })),
)
const PoolChampTabPanel = lazy(() =>
  import('../poolchamp/PoolChampTabPanel').then((module) => ({ default: module.PoolChampTabPanel })),
)
const SocialTabPanel = lazy(() => import('../social/SocialTabPanel').then((module) => ({ default: module.SocialTabPanel })))

// An unverified account keeps its home and match history, read-only.
const VERIFICATION_LOCKED_TABS: TabKey[] = ['aprendizaje', 'pool-champ', 'objetivos', 'social']

export function DashboardScreen({
  verification,
  isStartingVerification,
  onVerifyAccount,
  onAccountVerified,
  onCloseVerification,
  onDeleteUser,
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
  hasOlderMatches,
  historyWindowDays,
  statsSummary,
  homeStatsSummary,
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
  const socialSummaryQuery = useSocialSummary(isSignedIn)
  // Pending duo requests plus unread chat messages, shown on the Social tab.
  const socialBadge =
    (socialSummaryQuery.data?.pendingRequests ?? 0) + (socialSummaryQuery.data?.unreadMessages ?? 0)

  // Solo se evalúa una vez que poolView resolvió, para no mostrar un flash de
  // "bloqueado" mientras carga a una cuenta que sí tiene pool armado.
  const hasPool = poolView !== undefined && Boolean(poolView.pool)
  const needsVerification = Boolean(activeAccount && !activeAccount.verifiedAt)
  const poolLockedTabs: TabKey[] = poolView !== undefined && !hasPool ? ['aprendizaje', 'objetivos'] : []
  const lockedTabs = needsVerification ? VERIFICATION_LOCKED_TABS : poolLockedTabs
  const panelTab = needsVerification && VERIFICATION_LOCKED_TABS.includes(activeTab) ? null : activeTab

  const handleVerifyActiveAccount = () => {
    if (!activeAccount) return
    onVerifyAccount({ summoner: activeAccount.summoner, tag: activeAccount.tag, server: activeAccount.server })
  }

  const handleCloseVerification = () => {
    setIsAccountModalOpen(false)
    onCloseVerification()
  }

  const handleOpenGoalModal = () => {
    if (needsVerification) onTabChange('objetivos')
    else setGoalModalPrefill(null)
  }

  const handleOpenLesson = (index: number) => {
    setSelectedLessonIndex(index)
    onTabChange('aprendizaje')
  }

  const handleOpenChampionLesson = (championKey: string, role: PoolSlotKey) => {
    const index = lessons.findIndex(
      (lesson) => lesson.kind === 'champion' && lesson.championKey === championKey && lesson.championRole === role,
    )
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
    social: socialBadge,
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
          onDeleteAccount={onDeleteAccount}
          onSyncMatches={onSyncMatches}
          isSyncing={isSyncing}
          lastSyncedLabel={lastSyncedLabel}
        />

        <TwitchLiveBanner />

        {status && <p className="dashboard-status">{status}</p>}
        {isLoadingDashboard && <p className="dashboard-status">Cargando dashboard…</p>}

        {needsVerification && activeAccount && (
          <div className="dashboard-status verify-banner" role="status">
            <span>
              {activeAccount.summoner}#{activeAccount.tag} está en modo de solo lectura. Verifica que es tuya para
              desbloquear todas las funciones.
            </span>
            <button
              type="button"
              className="primary-btn"
              disabled={isStartingVerification}
              onClick={handleVerifyActiveAccount}
            >
              {isStartingVerification ? 'Preparando…' : 'Verificar cuenta'}
            </button>
          </div>
        )}

        {panelTab === null && (
          <LockedTabState
            title="Verifica tu cuenta"
            body="Esta función se desbloquea cuando compruebas que la cuenta de Riot es tuya. Solo tienes que cambiar por un momento su ícono de perfil."
            ctaLabel={isStartingVerification ? 'Preparando…' : 'Verificar cuenta'}
            onCtaClick={handleVerifyActiveAccount}
          />
        )}

        <Suspense fallback={<p className="dashboard-status">Cargando…</p>}>
        {activeTab === 'cuentas' && (
          <AccountTabPanel
            onOpenAccountModal={handleOpenAccountModal}
            userAccounts={userAccounts}
            activeAccount={activeAccount}
            currentAccountId={currentAccountId}
            ddragonVersion={ddragonVersion}
            statsSummary={statsSummary}
            homeStatsSummary={homeStatsSummary}
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
            onOpenGoalModal={handleOpenGoalModal}
            onOpenLesson={handleOpenLesson}
          />
        )}

        {activeTab === 'partidas' && (
          <MatchesTabPanel
            activeAccount={activeAccount}
            matches={matches}
            hasOlderMatches={hasOlderMatches}
            historyWindowDays={historyWindowDays}
            rankHistory={rankHistory}
            ddragonVersion={ddragonVersion}
          />
        )}

        {panelTab === 'aprendizaje' && (
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

        {panelTab === 'pool-champ' && (
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

        {panelTab === 'social' && userAccounts.length === 0 && (
          <LockedTabState
            title="Agrega tu cuenta"
            body="Para buscar duo primero vincula y verifica tu cuenta de Riot."
            ctaLabel="Agregar cuenta"
            onCtaClick={handleOpenAccountModal}
          />
        )}

        {panelTab === 'social' && userAccounts.length > 0 && (
          <SocialTabPanel userAccounts={userAccounts} activeAccount={activeAccount} ddragonVersion={ddragonVersion} />
        )}

        {panelTab === 'objetivos' && (
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
        </Suspense>

        <LegalFooter onDeleteUser={onDeleteUser} />
      </main>

      <AccountSearchModal
        isOpen={isAccountModalOpen && !verification}
        accountForm={accountForm}
        status={status}
        isSubmitting={isStartingVerification}
        onClose={() => setIsAccountModalOpen(false)}
        onAccountFieldChange={onAccountFieldChange}
        onCreateAccount={onCreateAccount}
      />

      {verification && (
        <AccountVerificationModal
          target={verification}
          initialChallenge={verification}
          ddragonVersion={ddragonVersion}
          onVerified={onAccountVerified}
          onClose={handleCloseVerification}
        />
      )}

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
