import { useState } from 'react'
import { AccountSearchModal } from './AccountSearchModal'
import { AccountTabPanel } from './AccountTabPanel'
import { CuentaTabPanel } from './CuentaTabPanel'
import { DashboardHeader } from './DashboardHeader'
import { DashboardSidebar } from './DashboardSidebar'
import { GoalsTabPanel } from './GoalsTabPanel'
import { LearningTabPanel } from './LearningTabPanel'
import { MatchesTabPanel } from './MatchesTabPanel'

import type { FormEvent } from 'react'
import type {
  AccountCard,
  AccountForm,
  AccountStatsSummary,
  ActivityDay,
  ChampionSplitStat,
  GoalItem,
  LaneEntry,
  LessonCard,
  MasteryEntry,
  MatchParticipantEntry,
  RankSnapshotEntry,
  StreakInfo,
  TabKey,
  TimeRange,
} from '../types/dashboard'

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
  mastery: MasteryEntry[]
  statsSummary: AccountStatsSummary | null
  streak: StreakInfo | null
  lanes: LaneEntry[]
  weeklyActivity: ActivityDay[]
  championsSplit: ChampionSplitStat[]
  rankHistory: RankSnapshotEntry[]
  lessons: LessonCard[]
  ddragonVersion: string | null
  timeRange: TimeRange
  isSyncing: boolean
  lastSyncedLabel: string
  onTimeRangeChange: (range: TimeRange) => void
  onTabChange: (tab: TabKey) => void
  onLogout: () => void
  onSetCurrentAccountId: (id: string) => void
  onAccountFieldChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onCreateAccount: (event: FormEvent<HTMLFormElement>) => void
  onDeleteAccount: (accountId: string) => void
  onSyncMatches: () => void
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
  mastery,
  statsSummary,
  streak,
  lanes,
  weeklyActivity,
  championsSplit,
  rankHistory,
  lessons,
  ddragonVersion,
  timeRange,
  isSyncing,
  lastSyncedLabel,
  onTimeRangeChange,
  onTabChange,
  onLogout,
  onSetCurrentAccountId,
  onAccountFieldChange,
  onCreateAccount,
  onDeleteAccount,
  onSyncMatches,
}: DashboardScreenProps) {
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)

  const handleOpenAccountModal = () => {
    onTabChange('cuentas')
    setIsAccountModalOpen(true)
  }

  const navMeta = {
    cuentas: userAccounts.length,
    partidas: statsSummary?.gamesPlayed ?? matches.length,
    aprendizaje: lessons.length,
    objetivos: goalsByAccount.length,
  }

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
        navMeta={navMeta}
      />

      <main className="forge-main">
        <DashboardHeader
          userAccounts={userAccounts}
          currentAccountId={currentAccountId}
          activeAccount={activeAccount}
          onSetCurrentAccountId={onSetCurrentAccountId}
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
            championsSplit={championsSplit}
            goalsByAccount={goalsByAccount}
            matches={matches}
            mastery={mastery}
            timeRange={timeRange}
            onTimeRangeChange={onTimeRangeChange}
            onSetCurrentAccountId={onSetCurrentAccountId}
            onDeleteAccount={onDeleteAccount}
            onGoToMatches={() => onTabChange('partidas')}
            onGoToGoals={() => onTabChange('objetivos')}
          />
        )}

        {activeTab === 'partidas' && (
          <MatchesTabPanel
            activeAccount={activeAccount}
            matches={matches}
            statsSummary={statsSummary}
            streak={streak}
            rankHistory={rankHistory}
            ddragonVersion={ddragonVersion}
          />
        )}

        {activeTab === 'aprendizaje' && (
          <LearningTabPanel
            activeAccount={activeAccount}
            lessons={lessons}
            gamesAnalyzed={statsSummary?.gamesPlayed ?? 0}
          />
        )}

        {activeTab === 'objetivos' && <GoalsTabPanel goalsByAccount={goalsByAccount} />}
      </main>

      <AccountSearchModal
        isOpen={isAccountModalOpen}
        accountForm={accountForm}
        status={status}
        onClose={() => setIsAccountModalOpen(false)}
        onAccountFieldChange={onAccountFieldChange}
        onCreateAccount={onCreateAccount}
      />
    </div>
  )
}
