import './App.css'

const dashboard = {
  user: {
    name: 'Cristian Chala',
    email: 'cris@leagueofcoach.com',
  },
  summary: {
    totalAccounts: 2,
    totalGoals: 4,
    totalLearnings: 3,
    activeFocus: 'Yasuo',
  },
  accounts: [
    {
      id: 'acc-1',
      summoner: 'Lolcito',
      tag: 'EUW',
      server: 'EUW',
      tier: 'Gold',
      division: 'II',
      lp: 42,
      learnings: [
        {
          champion: 'Yasuo',
          role: 'Top',
          games: 18,
          wins: 11,
          kdaK: 5.4,
          kdaD: 3.1,
          kdaA: 7.3,
          csMin: 7.2,
        },
        {
          champion: 'Gnar',
          role: 'Top',
          games: 15,
          wins: 9,
          kdaK: 4.8,
          kdaD: 3.6,
          kdaA: 6.9,
          csMin: 6.8,
        },
      ],
      goals: [
        { type: 'rank', title: 'Llegar a Platinum', progress: 64, deadline: '2026-12-31' },
        { type: 'role', title: 'Aprender Top Jungle', progress: 52, deadline: '2026-09-30' },
      ],
    },
    {
      id: 'acc-2',
      summoner: 'CoachTio',
      tag: 'NA',
      server: 'NA',
      tier: 'Silver',
      division: 'III',
      lp: 21,
      learnings: [
        {
          champion: 'Riven',
          role: 'Mid',
          games: 12,
          wins: 6,
          kdaK: 4.9,
          kdaD: 3.8,
          kdaA: 7.2,
          csMin: 8.1,
        },
      ],
      goals: [
        { type: 'rank', title: 'Subir a Gold', progress: 38, deadline: '2026-10-15' },
        { type: 'champion', title: 'Dominar Riven', progress: 71, deadline: '2026-09-21' },
      ],
    },
  ],
}

function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">LC</div>
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>League of Coach</h1>
          </div>
        </div>

        <nav className="nav">
          <button className="nav-item active">Resumen</button>
          <button className="nav-item">Cuentas</button>
          <button className="nav-item">Aprendizaje</button>
          <button className="nav-item">Objetivos</button>
        </nav>

        <div className="profile-card">
          <span className="status-dot" />
          <div>
            <strong>{dashboard.user.name}</strong>
            <small>{dashboard.user.email}</small>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Bienvenido</p>
            <h2>Tu progreso semanal</h2>
          </div>
          <button className="primary-btn">+ Nueva cuenta</button>
        </header>

        <section className="stats-grid">
          <article className="stat-card">
            <span>Cuentas</span>
            <strong>{dashboard.summary.totalAccounts}</strong>
            <small>Activas</small>
          </article>
          <article className="stat-card">
            <span>Objetivos</span>
            <strong>{dashboard.summary.totalGoals}</strong>
            <small>Personales</small>
          </article>
          <article className="stat-card">
            <span>Aprendizaje</span>
            <strong>{dashboard.summary.totalLearnings}</strong>
            <small>Campeones</small>
          </article>
          <article className="stat-card focus">
            <span>Foco actual</span>
            <strong>{dashboard.summary.activeFocus}</strong>
            <small>En revisión</small>
          </article>
        </section>

        <section className="panel-grid">
          <div className="panel">
            <div className="panel-header">
              <h3>Cuentas de LOL</h3>
              <span>2 perfiles</span>
            </div>

            {dashboard.accounts.map((account) => (
              <div key={account.id} className="account-card">
                <div className="account-head">
                  <div>
                    <h4>{account.summoner}</h4>
                    <small>{account.server} • #{account.tag}</small>
                  </div>
                  <span className="tier-pill">{account.tier} {account.division}</span>
                </div>

                <div className="rank-row">
                  <div>
                    <label>LP</label>
                    <strong>{account.lp}</strong>
                  </div>
                  <div>
                    <label>Rol foco</label>
                    <strong>{account.learnings[0]?.role ?? 'Sin datos'}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Aprendizaje manual</h3>
              <span>Comparación</span>
            </div>

            {dashboard.accounts.flatMap((account) =>
              account.learnings.map((learning) => (
                <div key={`${account.id}-${learning.champion}`} className="learning-card">
                  <div className="learning-topline">
                    <strong>{learning.champion}</strong>
                    <span>{learning.role}</span>
                  </div>
                  <div className="metrics-row">
                    <span>Partidas: {learning.games}</span>
                    <span>Victorias: {learning.wins}</span>
                  </div>
                  <div className="progress-bar">
                    <div style={{ width: `${Math.min(100, Math.round((learning.wins / Math.max(learning.games, 1)) * 100))}%` }} />
                  </div>
                  <small>KDA {learning.kdaK} / {learning.kdaD} / {learning.kdaA}</small>
                </div>
              )),
            )}
          </div>
        </section>

        <section className="panel goals-panel">
          <div className="panel-header">
            <h3>Objetivos personales</h3>
            <span>Meta mensual</span>
          </div>

          <div className="goals-list">
            {dashboard.accounts.flatMap((account) =>
              account.goals.map((goal) => (
                <div key={`${account.id}-${goal.title}`} className="goal-item">
                  <div>
                    <p className="goal-type">{goal.type}</p>
                    <h4>{goal.title}</h4>
                  </div>
                  <div className="goal-meta">
                    <strong>{goal.progress}%</strong>
                    <span>{goal.deadline}</span>
                  </div>
                  <div className="progress-bar">
                    <div style={{ width: `${goal.progress}%` }} />
                  </div>
                </div>
              )),
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
