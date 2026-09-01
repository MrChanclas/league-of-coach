import type { TabKey } from '../types/dashboard'

type DashboardSidebarProps = {
  userDisplayName: string
  userDisplayEmail: string
  activeTab: TabKey
  isSignedIn: boolean
  onTabChange: (tab: TabKey) => void
}

const protectedNavItems: { key: TabKey; label: string }[] = [
  { key: 'cuentas', label: 'Cuentas' },
  { key: 'partidas', label: 'Partidas' },
  { key: 'aprendizaje', label: 'Aprendizaje' },
  { key: 'objetivos', label: 'Objetivos' },
]

const cuentaNavItem: { key: TabKey; label: string } = { key: 'cuenta', label: 'Cuenta' }

export function DashboardSidebar({
  userDisplayName,
  userDisplayEmail,
  activeTab,
  isSignedIn,
  onTabChange,
}: DashboardSidebarProps) {
  const navItems = isSignedIn ? [...protectedNavItems, cuentaNavItem] : [cuentaNavItem]

  return (
    <aside className="forge-sidebar">
      <div className="brand-block">
        <div className="brand-mark">⚔</div>
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1>HEXFORGE</h1>
        </div>
      </div>

      <nav className="nav">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={activeTab === item.key ? 'nav-item active' : 'nav-item'}
            onClick={() => onTabChange(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {isSignedIn && (
        <div className="profile-card">
          <span className="status-dot" />
          <div>
            <strong>{userDisplayName}</strong>
            <small>{userDisplayEmail}</small>
          </div>
        </div>
      )}
    </aside>
  )
}
