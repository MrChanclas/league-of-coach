import { useState } from 'react'
import { AccountSearchModal } from './AccountSearchModal'
import { AccountTabPanel } from './AccountTabPanel'
import { CuentaTabPanel } from './CuentaTabPanel'
import { DashboardHeader } from './DashboardHeader'
import { DashboardSidebar } from './DashboardSidebar'
// Desactivado junto con el resumen de stats. Reactivar al reactivar <DashboardStatsGrid />.
// import { DashboardStatsGrid } from './DashboardStatsGrid'
import { GoalsTabPanel } from './GoalsTabPanel'
import { LearningTabPanel } from './LearningTabPanel'
import { MatchesTabPanel } from './MatchesTabPanel'

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
  isSignedIn: boolean
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
  // dashboardSummary no se usa mientras <DashboardStatsGrid /> está desactivado; se mantiene en el tipo de props.
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
  onDeleteAccount,
  onSyncMatches,
}: DashboardScreenProps) {
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)

  const handleOpenAccountModal = () => {
    onGoToAccountsTab()
    setIsAccountModalOpen(true)
  }

  return (
    <div className={isSignedIn ? 'forge-shell' : 'forge-shell forge-shell--auth-only'}>
      {isSignedIn && (
        <DashboardSidebar
          userDisplayName={userDisplayName}
          userDisplayEmail={userDisplayEmail}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onLogout={onLogout}
        />
      )}

      <main className="forge-main">
        {isSignedIn && (
          <>
            <DashboardHeader onOpenAccountModal={handleOpenAccountModal} />

            {status && <p className="dashboard-status">{status}</p>}
            {isLoadingDashboard && <p className="dashboard-status">Cargando dashboard…</p>}

            {/* Resumen (Foco, Sesiones, Meta, Cuentas, Objetivos, Aprendizaje, Foco actual) desactivado a pedido. */}
            {/* <DashboardStatsGrid summary={dashboardSummary} /> */}
          </>
        )}

        {isSignedIn && activeTab === 'cuentas' && (
          <AccountTabPanel
            userAccounts={userAccounts}
            activeAccount={activeAccount}
            currentAccountId={currentAccountId}
            onSetCurrentAccountId={onSetCurrentAccountId}
            onDeleteAccount={onDeleteAccount}
          />
        )}

        {isSignedIn && activeTab === 'partidas' && (
          <MatchesTabPanel
            activeAccount={activeAccount}
            matches={matches}
            mastery={mastery}
            statsSummary={statsSummary}
            isLoading={isLoadingMatches}
            onSyncMatches={onSyncMatches}
          />
        )}

        {isSignedIn && activeTab === 'aprendizaje' && <LearningTabPanel championData={championData} />}
        {isSignedIn && activeTab === 'objetivos' && <GoalsTabPanel goalsByAccount={goalsByAccount} />}
        {!isSignedIn && <CuentaTabPanel />}
      </main>

      {isSignedIn && (
        <AccountSearchModal
          isOpen={isAccountModalOpen}
          accountForm={accountForm}
          status={status}
          onClose={() => setIsAccountModalOpen(false)}
          onAccountFieldChange={onAccountFieldChange}
          onCreateAccount={onCreateAccount}
        />
      )}
    </div>
  )
}
