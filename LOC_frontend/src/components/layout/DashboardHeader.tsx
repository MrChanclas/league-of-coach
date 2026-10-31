import { useState } from 'react'
import { BottomSheet } from '../shared/BottomSheet'
import { LocMark } from '../shared/LocMark'
import type { DashboardHeaderProps } from '../../types/components'

export function DashboardHeader({
  userAccounts,
  currentAccountId,
  activeAccount,
  onSetCurrentAccountId,
  onOpenAccountModal,
  onDeleteAccount,
  onSyncMatches,
  isSyncing,
  lastSyncedLabel,
}: DashboardHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSyncSheetOpen, setIsSyncSheetOpen] = useState(false)

  const contextLabel = activeAccount ? `${activeAccount.server} · LEAGUE OF COACH` : 'LEAGUE OF COACH'
  // Sin sincronizar todavía en esta sesión = oro; ya sincronizó = verde — el
  // punto del botón compacto de mobile es la única señal que queda cuando el
  // texto no entra (ver handoff_loc/05-movil.md).
  const hasSyncedThisSession = !lastSyncedLabel.startsWith('Sin sincronizar')

  const handleSelectAccount = (accountId: string) => {
    onSetCurrentAccountId(accountId)
    setIsMenuOpen(false)
  }

  const handleDeleteActiveAccount = () => {
    if (!activeAccount) return
    setIsMenuOpen(false)
    const confirmed = window.confirm(
      `¿Seguro que quieres desvincular "${activeAccount.summoner}#${activeAccount.tag}"? Esto también borra sus partidas, objetivos y aprendizaje guardados.`,
    )
    if (confirmed) onDeleteAccount(activeAccount.id)
  }

  return (
    <header className="forge-header">
      <LocMark size={24} weight="bold" className="mobile-header-mark" />
      <span className="header-context">{contextLabel}</span>

      {activeAccount && (
        <div className="header-account-select">
          <button
            type="button"
            className="header-account-btn"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
          >
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
                  onClick={() => handleSelectAccount(account.id)}
                >
                  {account.summoner} #{account.tag}
                </button>
              ))}
              <button
                type="button"
                className="header-account-menu-item header-account-menu-item--danger"
                onClick={handleDeleteActiveAccount}
              >
                Desvincular {activeAccount.summoner}
              </button>
            </div>
          )}

          <BottomSheet isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} ariaLabel="Seleccionar cuenta">
            <div className="sheet-label">CUENTAS REGISTRADAS</div>
            <div className="sheet-account-list">
              {userAccounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  className={account.id === currentAccountId ? 'sheet-account active' : 'sheet-account'}
                  onClick={() => handleSelectAccount(account.id)}
                >
                  <div className="avatar-tile avatar-tile--md">{account.summoner.slice(0, 2).toUpperCase()}</div>
                  <div className="sheet-account-text">
                    <div className="sheet-account-name">{account.summoner}</div>
                    <div className="sheet-account-tag">
                      {account.server} · #{account.tag}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="sheet-ghost-btn"
              onClick={() => {
                setIsMenuOpen(false)
                onOpenAccountModal()
              }}
            >
              + Registrar cuenta
            </button>
            <button type="button" className="sheet-ghost-btn sheet-ghost-btn--danger" onClick={handleDeleteActiveAccount}>
              Desvincular {activeAccount.summoner}
            </button>
          </BottomSheet>
        </div>
      )}

      <div className="header-spacer" />

      <div className="header-sync-status">
        <span className="header-sync-dot" />
        {lastSyncedLabel}
      </div>

      <button
        type="button"
        data-tour="sincronizar"
        className="header-sync-btn"
        onClick={onSyncMatches}
        disabled={isSyncing || !activeAccount}
      >
        {isSyncing ? 'Sincronizando…' : 'Sincronizar ahora'}
      </button>

      <button
        type="button"
        data-tour="sincronizar"
        className={hasSyncedThisSession ? 'header-sync-btn-compact synced' : 'header-sync-btn-compact'}
        onClick={() => setIsSyncSheetOpen(true)}
        aria-label="Estado de sincronización"
      >
        <span className="header-sync-dot" />
      </button>

      <BottomSheet isOpen={isSyncSheetOpen} onClose={() => setIsSyncSheetOpen(false)} ariaLabel="Sincronización de partidas">
        <div className="sheet-label">SINCRONÍA</div>
        <p className="sheet-body-text">{lastSyncedLabel}</p>
        <button
          type="button"
          className="primary-btn sheet-primary-btn"
          disabled={isSyncing || !activeAccount}
          onClick={() => {
            setIsSyncSheetOpen(false)
            onSyncMatches()
          }}
        >
          {isSyncing ? 'Sincronizando…' : 'Sincronizar ahora'}
        </button>
      </BottomSheet>
    </header>
  )
}
