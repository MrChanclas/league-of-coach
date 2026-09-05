import { getChampionIconUrl } from '../lib/riotAssets'
import type { ChampionSplitStat } from '../types/dashboard'

type TopChampionsCardProps = {
  champions: ChampionSplitStat[]
  ddragonVersion: string | null
}

export function TopChampionsCard({ champions, ddragonVersion }: TopChampionsCardProps) {
  const top = champions.slice(0, 4)
  const totalGames = champions.reduce((sum, champion) => sum + champion.gamesPlayed, 0)

  return (
    <div className="side-card">
      <div className="side-card-head">
        <div className="side-card-label">CAMPEONES DEL SPLIT</div>
        <span>{totalGames} J</span>
      </div>

      {top.length === 0 ? (
        <p className="side-empty">Todavía no hay partidas suficientes en este período.</p>
      ) : (
        <div className="champions-list">
          {top.map((champion) => {
            const winratePct = Math.round(champion.winrate * 100)
            const iconUrl = ddragonVersion ? getChampionIconUrl(champion.champion, ddragonVersion) : null
            const color = winratePct >= 50 ? 'var(--hf-win-blue)' : 'var(--hf-loss)'

            return (
              <div key={champion.champion} className="champion-row">
                {iconUrl ? (
                  <img className="avatar-img avatar-img--sm" src={iconUrl} alt={champion.champion} />
                ) : (
                  <div className="avatar-tile avatar-tile--sm">{champion.champion.slice(0, 2).toUpperCase()}</div>
                )}
                <div className="champion-row-body">
                  <div className="champion-row-name">{champion.champion}</div>
                  <div className="champion-row-bar-track">
                    <div
                      className="champion-row-bar-fill"
                      style={{ width: `${winratePct}%`, background: color }}
                    />
                  </div>
                </div>
                <div className="champion-row-side">
                  <div className="champion-row-wr" style={{ color }}>
                    {winratePct}%
                  </div>
                  <div className="champion-row-games">{champion.gamesPlayed} J</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
