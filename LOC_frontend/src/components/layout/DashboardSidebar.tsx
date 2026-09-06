import { useState } from 'react'
import { getTierColor } from '../../lib/hexforge'
import type { AccountCard, TabKey } from '../../types/dashboard'

type DashboardSidebarProps = {
  userDisplayName: string
  userDisplayEmail: string
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  onLogout: () => void
  userAccounts: AccountCard[]
  currentAccountId: string
  onSetCurrentAccountId: (id: string) => void
  onOpenAccountModal: () => void
  onReplayOnboarding: () => void
  navMeta: { cuentas: number; partidas: number; aprendizaje: number; objetivos: number }
}

const navItems: { key: TabKey; label: string; tour?: string }[] = [
  { key: 'cuentas', label: 'Cuentas' },
  { key: 'partidas', label: 'Partidas' },
  { key: 'aprendizaje', label: 'Aprendizaje', tour: 'nav-aprendizaje' },
  { key: 'objetivos', label: 'Objetivos', tour: 'nav-objetivos' },
]

function titleCaseTier(tier: string) {
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()
}

function getPrimaryQueueLabel(account: AccountCard) {
  const isSoloRanked = account.soloTier !== 'Unranked'
  const isFlexRanked = account.flexTier !== 'Unranked'
  if (!isSoloRanked && !isFlexRanked) return { label: 'Sin clasificar', color: null }

  const tier = isSoloRanked ? account.soloTier : account.flexTier
  const division = isSoloRanked ? account.soloDivision : account.flexDivision
  const lp = isSoloRanked ? account.soloLp : account.flexLp
  return { label: `${titleCaseTier(tier)} ${division} · ${lp}`, color: getTierColor(tier) }
}

export function DashboardSidebar({
  userDisplayName,
  userDisplayEmail,
  activeTab,
  onTabChange,
  onLogout,
  userAccounts,
  currentAccountId,
  onSetCurrentAccountId,
  onOpenAccountModal,
  onReplayOnboarding,
  navMeta,
}: DashboardSidebarProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)

  return (
    <aside className="forge-sidebar">
      <div className="sidebar-scroll">
        <div className="sidebar-brand">
          <img className="sidebar-brand-mark" src="/loc-mark.svg" alt="" />
          <div>
            <div className="sidebar-brand-eyebrow">LEAGUE OF COACHING</div>
            <div className="sidebar-brand-name">LoC</div>
          </div>
        </div>

        <div className="sidebar-section-label">NAVEGACIÓN</div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              data-tour={item.tour}
              className={activeTab === item.key ? 'nav-item active' : 'nav-item'}
              onClick={() => onTabChange(item.key)}
            >
              <span className="nav-item-dot" />
              <span className="nav-item-label">{item.label}</span>
              <span className="nav-item-meta">{navMeta[item.key]}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-section-label">CUENTAS VINCULADAS</div>
        <div className="sidebar-accounts">
          {userAccounts.map((account) => {
            const queue = getPrimaryQueueLabel(account)
            return (
              <button
                key={account.id}
                type="button"
                className={account.id === currentAccountId ? 'sidebar-account active' : 'sidebar-account'}
                onClick={() => onSetCurrentAccountId(account.id)}
              >
                <div className="avatar-tile avatar-tile--md">{account.summoner.slice(0, 2).toUpperCase()}</div>
                <div className="sidebar-account-text">
                  <div className="sidebar-account-name">{account.summoner}</div>
                  <div className="sidebar-account-tier">{queue.label}</div>
                </div>
                <span className="sidebar-account-dot" style={{ background: queue.color ?? undefined }} />
              </button>
            )
          })}

          <button type="button" data-tour="registrar-cuenta" className="sidebar-link-account" onClick={onOpenAccountModal}>
            + Vincular cuenta Riot
          </button>
        </div>
      </div>

      <div className="profile-card">
        <button
          type="button"
          className="profile-card-info profile-card-trigger"
          onClick={() => setIsProfileMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={isProfileMenuOpen}
        >
          <span className="status-dot" />
          <div className="profile-card-text">
            <strong>{userDisplayName}</strong>
            <small>{userDisplayEmail}</small>
          </div>
        </button>

        {isProfileMenuOpen && (
          <div className="profile-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              className="profile-menu-item"
              onClick={() => {
                setIsProfileMenuOpen(false)
                onReplayOnboarding()
              }}
            >
              Ver el recorrido
            </button>
            <button
              type="button"
              role="menuitem"
              className="profile-menu-item profile-menu-item--danger"
              onClick={() => {
                setIsProfileMenuOpen(false)
                onLogout()
              }}
            >
              Salir
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
