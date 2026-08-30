type UsersTabPanelProps = {
  userDisplayName: string
  userAccountsCount: number
}

export function UsersTabPanel({ userDisplayName, userAccountsCount }: UsersTabPanelProps) {
  return (
    <section className="panel-block">
      <div className="panel-header">
        <h3>Usuarios internos</h3>
        <span>Coaches</span>
      </div>

      <div className="card-grid">
        <article className="info-card user-card">
          <div className="avatar-row">
            <span className="avatar large" style={{ background: '#0ac8b922', borderColor: '#0ac8b988', color: '#0ac8b9' }}>
              {userDisplayName.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h4>{userDisplayName}</h4>
              <small>{userAccountsCount} cuentas</small>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
