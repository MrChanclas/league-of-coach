type DashboardHeaderProps = {
  onOpenAccountModal: () => void
}

export function DashboardHeader({ onOpenAccountModal }: DashboardHeaderProps) {
  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">Bienvenido</span>
        <h2>Tu progreso semanal</h2>
      </div>

      <div className="topbar-actions">
        <button type="button" className="primary-btn" onClick={onOpenAccountModal}>+ Nueva cuenta Riot</button>
      </div>
    </header>
  )
}
