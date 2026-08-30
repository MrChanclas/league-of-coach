import type { ChampionStat } from '../types/dashboard'

type LearningTabPanelProps = {
  championData: ChampionStat[]
}

export function LearningTabPanel({ championData }: LearningTabPanelProps) {
  return (
    <section className="panel-block">
      <div className="panel-header">
        <h3>Aprendizaje manual</h3>
        <span>Comparación</span>
      </div>

      <div className="stack-list">
        {championData.length === 0 ? (
          <p>Aún no hay datos de aprendizaje para esta cuenta.</p>
        ) : (
          championData.map((entry) => {
            const winrate = Math.round((entry.wins / Math.max(entry.games, 1)) * 100)
            return (
              <article key={`${entry.champion}-${entry.role}`} className="info-card learning-card">
                <div className="learning-head">
                  <div className="champion-mark">{entry.champion.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <h4>{entry.champion}</h4>
                    <span className="chip chip-gold">{entry.role}</span>
                  </div>
                </div>

                <div className="mini-grid">
                  <div className="mini-stat">
                    <span>Partidas</span>
                    <strong>{entry.games}</strong>
                  </div>
                  <div className="mini-stat">
                    <span>Winrate</span>
                    <strong>{winrate}%</strong>
                  </div>
                  <div className="mini-stat">
                    <span>KDA</span>
                    <strong>{entry.kdaK}/{entry.kdaD}/{entry.kdaA}</strong>
                  </div>
                  <div className="mini-stat">
                    <span>CS/min</span>
                    <strong>{entry.csMin}</strong>
                  </div>
                </div>

                <div className="progress-bar">
                  <div style={{ width: `${winrate}%` }} />
                </div>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}
