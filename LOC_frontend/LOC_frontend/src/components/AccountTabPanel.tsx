import type { AccountCard, AccountForm } from '../types/dashboard'

type AccountTabPanelProps = {
  userAccounts: AccountCard[]
  activeAccount?: AccountCard
  currentAccountId: string
  accountForm: AccountForm
  onSetCurrentAccountId: (id: string) => void
  onAccountFieldChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onCreateAccount: (event: React.FormEvent<HTMLFormElement>) => void
}

export function AccountTabPanel({
  userAccounts,
  activeAccount,
  currentAccountId,
  accountForm,
  onSetCurrentAccountId,
  onAccountFieldChange,
  onCreateAccount,
}: AccountTabPanelProps) {
  return (
    <section className="panel-block">
      <div className="panel-header">
        <h3>Cuentas de LOL</h3>
        <span>{userAccounts.length} perfiles</span>
      </div>

      <div className="account-switcher">
        {userAccounts.map((account) => (
          <button
            key={account.id}
            type="button"
            className={account.id === currentAccountId ? 'switch-pill active' : 'switch-pill'}
            onClick={() => onSetCurrentAccountId(account.id)}
          >
            {account.summoner}
          </button>
        ))}
      </div>

      <div className="card-grid">
        {userAccounts.length === 0 ? (
          <p>No hay cuentas detectadas todavía. Busca una cuenta real de Riot para empezar a entrenar.</p>
        ) : (
          userAccounts.map((account) => (
            <article key={account.id} className="info-card">
              <div className="info-card-head">
                <div>
                  <h4>{account.summoner}</h4>
                  <small>{account.server} • #{account.tag}</small>
                </div>
                <span className="tier-badge">
                  {activeAccount?.id === account.id ? 'Mid' : 'Top'}
                </span>
              </div>

              <div className="mini-grid">
                <div className="mini-stat">
                  <span>Solo/Dúo</span>
                  <strong>{account.soloTier} {account.soloDivision}</strong>
                </div>
                <div className="mini-stat">
                  <span>LP Solo/Dúo</span>
                  <strong>{account.soloLp}</strong>
                </div>
                <div className="mini-stat">
                  <span>Flexible</span>
                  <strong>{account.flexTier} {account.flexDivision}</strong>
                </div>
                <div className="mini-stat">
                  <span>LP Flexible</span>
                  <strong>{account.flexLp}</strong>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <form className="auth-form" onSubmit={onCreateAccount}>
        <h4>Buscar cuenta Riot</h4>
        <div className="card-grid">
          <label>
            Nombre del invocador
            <input
              name="summoner"
              value={accountForm.summoner}
              onChange={onAccountFieldChange}
              placeholder="Ej: Captain Chala (sin #tag)"
              required
            />
          </label>
          <label>
            Tag
            <input name="tag" value={accountForm.tag} onChange={onAccountFieldChange} placeholder="Ej: LAS" required />
          </label>
          <label>
            Servidor
            <input name="server" value={accountForm.server} onChange={onAccountFieldChange} placeholder="Ej: LAS" required />
          </label>
        </div>
        <p className="auth-help">Se realizará una búsqueda en Riot para comprobar que esa cuenta existe antes de vincularla a tu perfil.</p>
        <button type="submit" className="primary-btn">Detectar cuenta</button>
      </form>
    </section>
  )
}
