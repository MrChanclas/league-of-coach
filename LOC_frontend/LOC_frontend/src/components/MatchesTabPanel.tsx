import type { AccountCard, AccountStatsSummary, MasteryEntry, MatchParticipantEntry } from '../types/dashboard'

type MatchesTabPanelProps = {
  activeAccount?: AccountCard
  matches: MatchParticipantEntry[]
  mastery: MasteryEntry[]
  statsSummary: AccountStatsSummary | null
  isLoading: boolean
  onSyncMatches: () => void
}

export function MatchesTabPanel({
  activeAccount,
  matches,
  mastery,
  statsSummary,
  isLoading,
  onSyncMatches,
}: MatchesTabPanelProps) {
  if (!activeAccount) {
    return (
      <section className="panel-block">
        <div className="panel-header">
          <h3>Partidas</h3>
        </div>
        <p>Agrega una cuenta de Riot en la pestaña "Cuentas" para ver tu historial de partidas.</p>
      </section>
    )
  }

  return (
    <section className="panel-block">
      <div className="panel-header">
        <h3>Historial de partidas</h3>
        <button type="button" className="primary-btn" onClick={onSyncMatches} disabled={isLoading}>
          {isLoading ? 'Sincronizando…' : 'Sincronizar partidas'}
        </button>
      </div>

      {statsSummary && statsSummary.gamesPlayed > 0 && (
        <div className="mini-grid">
          <div className="mini-stat">
            <span>Partidas</span>
            <strong>{statsSummary.gamesPlayed}</strong>
          </div>
          <div className="mini-stat">
            <span>Winrate</span>
            <strong>{Math.round(statsSummary.winrate * 100)}%</strong>
          </div>
          <div className="mini-stat">
            <span>KDA prom.</span>
            <strong>{statsSummary.avgKda.toFixed(2)}</strong>
          </div>
          <div className="mini-stat">
            <span>CS/min prom.</span>
            <strong>{statsSummary.avgCsPerMin.toFixed(1)}</strong>
          </div>
        </div>
      )}

      <div className="stack-list">
        {matches.length === 0 ? (
          <p>Aún no hay partidas sincronizadas para esta cuenta.</p>
        ) : (
          matches.map((entry) => (
            <article key={entry.id} className="info-card">
              <div className="info-card-head">
                <div>
                  <h4>{entry.champion}</h4>
                  <small>{entry.teamPosition || 'Sin rol'} • {new Date(entry.match.gameCreation).toLocaleString()}</small>
                </div>
                <span className={entry.win ? 'chip chip-gold' : 'chip'}>{entry.win ? 'Victoria' : 'Derrota'}</span>
              </div>

              <div className="mini-grid">
                <div className="mini-stat">
                  <span>KDA</span>
                  <strong>{entry.kills}/{entry.deaths}/{entry.assists}</strong>
                </div>
                <div className="mini-stat">
                  <span>CS</span>
                  <strong>{entry.csTotal}</strong>
                </div>
                <div className="mini-stat">
                  <span>Oro</span>
                  <strong>{entry.goldEarned}</strong>
                </div>
                <div className="mini-stat">
                  <span>Duración</span>
                  <strong>{Math.round(entry.match.gameDuration / 60)} min</strong>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="panel-header">
        <h3>Maestría de campeones</h3>
      </div>

      <div className="stack-list">
        {mastery.length === 0 ? (
          <p>No hay datos de maestría disponibles.</p>
        ) : (
          mastery.map((entry) => (
            <article key={entry.championId} className="info-card learning-card">
              <div className="learning-head">
                <div className="champion-mark">{entry.championName.slice(0, 2).toUpperCase()}</div>
                <div>
                  <h4>{entry.championName}</h4>
                  <span className="chip chip-gold">Nivel {entry.championLevel}</span>
                </div>
              </div>
              <div className="mini-stat">
                <span>Puntos</span>
                <strong>{entry.championPoints.toLocaleString()}</strong>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
