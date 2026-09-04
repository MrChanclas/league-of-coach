import { getTierColor } from '../lib/hexforge'
import type { AccountCard, TabKey } from '../types/dashboard'

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
  navMeta: { cuentas: number; partidas: number; aprendizaje: number; objetivos: number }
}

const navItems: { key: TabKey; label: string }[] = [
  { key: 'cuentas', label: 'Cuentas' },
  { key: 'partidas', label: 'Partidas' },
  { key: 'aprendizaje', label: 'Aprendizaje' },
  { key: 'objetivos', label: 'Objetivos' },
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
  navMeta,
}: DashboardSidebarProps) {
  return (
    <aside className="forge-sidebar">
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

        <button type="button" className="sidebar-link-account" onClick={onOpenAccountModal}>
          + Vincular cuenta Riot
        </button>
      </div>

      <div className="sidebar-spacer" />

      <div className="profile-card">
        <div className="profile-card-info">
          <span className="status-dot" />
          <div className="profile-card-text">
            <strong>{userDisplayName}</strong>
            <small>{userDisplayEmail}</small>
          </div>
        </div>
        <button type="button" className="link-btn profile-card-logout" onClick={onLogout}>
          Salir
        </button>
      </div>
    </aside>
  )
}
