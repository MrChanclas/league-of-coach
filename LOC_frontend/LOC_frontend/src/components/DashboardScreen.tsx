import { AccountTabPanel } from './AccountTabPanel'
import { DashboardHeader } from './DashboardHeader'
import { DashboardSidebar } from './DashboardSidebar'
import { DashboardStatsGrid } from './DashboardStatsGrid'
import { GoalsTabPanel } from './GoalsTabPanel'
import { LearningTabPanel } from './LearningTabPanel'
import { MatchesTabPanel } from './MatchesTabPanel'
import { UsersTabPanel } from './UsersTabPanel'

import type { FormEvent } from 'react'
import type {
  AccountCard,
  AccountForm,
  AccountStatsSummary,
  ChampionStat,
  DashboardSummary,
  GoalItem,
  MasteryEntry,
  MatchParticipantEntry,
  TabKey,
} from '../types/dashboard'

type DashboardScreenProps = {
  userDisplayName: string
  userDisplayEmail: string
  activeTab: TabKey
  userAccounts: AccountCard[]
  currentAccountId: string
  activeAccount?: AccountCard
  dashboardSummary: DashboardSummary
  goalsByAccount: GoalItem[]
  championData: ChampionStat[]
  status: string
  isLoadingDashboard: boolean
  accountForm: AccountForm
  matches: MatchParticipantEntry[]
  mastery: MasteryEntry[]
  statsSummary: AccountStatsSummary | null
  isLoadingMatches: boolean
  onTabChange: (tab: TabKey) => void
  onLogout: () => void
  onGoToAccountsTab: () => void
  onSetCurrentAccountId: (id: string) => void
  onAccountFieldChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onCreateAccount: (event: FormEvent<HTMLFormElement>) => void
  onSyncMatches: () => void
}

export function DashboardScreen({
  userDisplayName,
  userDisplayEmail,
  activeTab,
  userAccounts,
  currentAccountId,
  activeAccount,
  dashboardSummary,
  goalsByAccount,
  championData,
  status,
  isLoadingDashboard,
  accountForm,
  matches,
  mastery,
  statsSummary,
  isLoadingMatches,
  onTabChange,
  onLogout,
  onGoToAccountsTab,
  onSetCurrentAccountId,
  onAccountFieldChange,
  onCreateAccount,
  onSyncMatches,
}: DashboardScreenProps) {
  return (
    <div className="forge-shell">
      <DashboardSidebar
        userDisplayName={userDisplayName}
        userDisplayEmail={userDisplayEmail}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      <main className="forge-main">
        <DashboardHeader onLogout={onLogout} onGoToAccountsTab={onGoToAccountsTab} />

        {status && <p className="dashboard-status">{status}</p>}
        {isLoadingDashboard && <p className="dashboard-status">Cargando dashboard…</p>}

        <DashboardStatsGrid summary={dashboardSummary} />

        {activeTab === 'cuentas' && (
          <AccountTabPanel
            userAccounts={userAccounts}
            activeAccount={activeAccount}
            currentAccountId={currentAccountId}
            accountForm={accountForm}
            onSetCurrentAccountId={onSetCurrentAccountId}
            onAccountFieldChange={onAccountFieldChange}
            onCreateAccount={onCreateAccount}
          />
        )}

        {activeTab === 'partidas' && (
          <MatchesTabPanel
            activeAccount={activeAccount}
            matches={matches}
            mastery={mastery}
            statsSummary={statsSummary}
            isLoading={isLoadingMatches}
            onSyncMatches={onSyncMatches}
          />
        )}

        {activeTab === 'aprendizaje' && <LearningTabPanel championData={championData} />}
        {activeTab === 'objetivos' && <GoalsTabPanel goalsByAccount={goalsByAccount} />}
        {activeTab === 'usuarios' && (
          <UsersTabPanel userDisplayName={userDisplayName} userAccountsCount={userAccounts.length} />
        )}
      </main>
    </div>
  )
}
