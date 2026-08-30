import { AccountTabPanel } from './AccountTabPanel'
import { DashboardHeader } from './DashboardHeader'
import { DashboardSidebar } from './DashboardSidebar'
import { DashboardStatsGrid } from './DashboardStatsGrid'
import { GoalsTabPanel } from './GoalsTabPanel'
import { LearningTabPanel } from './LearningTabPanel'
import { UsersTabPanel } from './UsersTabPanel'

import type { FormEvent } from 'react'
import type {
  AccountCard,
  AccountForm,
  ChampionStat,
  DashboardSummary,
  GoalItem,
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
  onTabChange: (tab: TabKey) => void
  onLogout: () => void
  onAddRiotAccount: () => void
  onSetCurrentAccountId: (id: string) => void
  onAccountFieldChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onCreateAccount: (event: FormEvent<HTMLFormElement>) => void
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
  onTabChange,
  onLogout,
  onAddRiotAccount,
  onSetCurrentAccountId,
  onAccountFieldChange,
  onCreateAccount,
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
        <DashboardHeader onLogout={onLogout} onAddRiotAccount={onAddRiotAccount} />

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

        {activeTab === 'aprendizaje' && <LearningTabPanel championData={championData} />}
        {activeTab === 'objetivos' && <GoalsTabPanel goalsByAccount={goalsByAccount} />}
        {activeTab === 'usuarios' && (
          <UsersTabPanel userDisplayName={userDisplayName} userAccountsCount={userAccounts.length} />
        )}
      </main>
    </div>
  )
}
