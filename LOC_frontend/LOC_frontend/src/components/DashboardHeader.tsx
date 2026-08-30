type DashboardHeaderProps = {
  onLogout: () => void
  onAddRiotAccount: () => void
}

export function DashboardHeader({ onLogout, onAddRiotAccount }: DashboardHeaderProps) {
  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">Bienvenido</span>
        <h2>Tu progreso semanal</h2>
      </div>

      <div className="topbar-actions">
        <button type="button" className="secondary-btn" onClick={onLogout}>Cerrar sesión</button>
        <button type="button" className="primary-btn" onClick={onAddRiotAccount}>+ Nueva cuenta Riot</button>
      </div>
    </header>
  )
}
