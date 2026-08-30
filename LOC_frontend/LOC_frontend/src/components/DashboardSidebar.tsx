import type { TabKey } from '../types/dashboard'

type DashboardSidebarProps = {
  userDisplayName: string
  userDisplayEmail: string
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
}

export function DashboardSidebar({
  userDisplayName,
  userDisplayEmail,
  activeTab,
  onTabChange,
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

      <div className="sidebar-section">
        <p className="mini-label">Usuario activo</p>
        <div className="user-list">
          <button type="button" className="user-pill active">
            <span className="avatar" style={{ background: '#0ac8b922', borderColor: '#0ac8b988', color: '#0ac8b9' }}>
              {userDisplayName.slice(0, 2).toUpperCase()}
            </span>
            {userDisplayName}
          </button>
        </div>
      </div>

      <nav className="nav">
        {[
          { key: 'cuentas', label: 'Cuentas' },
          { key: 'partidas', label: 'Partidas' },
          { key: 'aprendizaje', label: 'Aprendizaje' },
          { key: 'objetivos', label: 'Objetivos' },
          { key: 'usuarios', label: 'Usuarios' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            className={activeTab === item.key ? 'nav-item active' : 'nav-item'}
            onClick={() => onTabChange(item.key as TabKey)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="profile-card">
        <span className="status-dot" />
        <div>
          <strong>{userDisplayName}</strong>
          <small>{userDisplayEmail}</small>
        </div>
      </div>
    </aside>
  )
}
