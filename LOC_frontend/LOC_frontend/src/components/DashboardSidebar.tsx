import type { TabKey } from '../types/dashboard'

type DashboardSidebarProps = {
  userDisplayName: string
  userDisplayEmail: string
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  onLogout: () => void
}

const navItems: { key: TabKey; label: string }[] = [
  { key: 'cuentas', label: 'Cuentas' },
  { key: 'partidas', label: 'Partidas' },
  { key: 'aprendizaje', label: 'Aprendizaje' },
  { key: 'objetivos', label: 'Objetivos' },
]

export function DashboardSidebar({
  userDisplayName,
  userDisplayEmail,
  activeTab,
  onTabChange,
  onLogout,
}: DashboardSidebarProps) {
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

      <div className="profile-card">
        <div className="profile-card-info">
          <span className="status-dot" />
          <div>
            <strong>{userDisplayName}</strong>
            <small>{userDisplayEmail}</small>
          </div>
        </div>
        <button type="button" className="link-btn profile-card-logout" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
