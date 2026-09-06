import { useState } from 'react'
import type { AccountCard } from '../../types/dashboard'

type DashboardHeaderProps = {
  userAccounts: AccountCard[]
  currentAccountId: string
  activeAccount?: AccountCard
  onSetCurrentAccountId: (id: string) => void
  onSyncMatches: () => void
  isSyncing: boolean
  lastSyncedLabel: string
}

export function DashboardHeader({
  userAccounts,
  currentAccountId,
  activeAccount,
  onSetCurrentAccountId,
  onSyncMatches,
  isSyncing,
  lastSyncedLabel,
}: DashboardHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const contextLabel = activeAccount ? `${activeAccount.server} · LEAGUE OF COACH` : 'LEAGUE OF COACH'

  return (
    <header className="forge-header">
      <span className="header-context">{contextLabel}</span>

      {activeAccount && (
        <div className="header-account-select">
          <button type="button" className="header-account-btn" onClick={() => setIsMenuOpen((open) => !open)}>
            <div className="avatar-tile avatar-tile--xs">{activeAccount.summoner.slice(0, 2).toUpperCase()}</div>
            <div className="header-account-btn-info">
              <span className="header-account-btn-label">CUENTA EN ANÁLISIS</span>
              <span className="header-account-btn-name">{activeAccount.summoner}</span>
            </div>
            <span className="header-account-caret">▾</span>
          </button>

          {isMenuOpen && (
            <div className="header-account-menu">
              {userAccounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  className={account.id === currentAccountId ? 'header-account-menu-item active' : 'header-account-menu-item'}
                  onClick={() => {
                    onSetCurrentAccountId(account.id)
                    setIsMenuOpen(false)
                  }}
                >
                  {account.summoner} #{account.tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="header-spacer" />

      <div className="header-sync-status">
        <span className="header-sync-dot" />
        {lastSyncedLabel}
      </div>

      <button type="button" className="header-sync-btn" onClick={onSyncMatches} disabled={isSyncing || !activeAccount}>
        {isSyncing ? 'Sincronizando…' : 'Sincronizar ahora'}
      </button>
    </header>
  )
}
