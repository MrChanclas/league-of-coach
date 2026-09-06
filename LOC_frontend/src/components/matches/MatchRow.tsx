import { getChampionIconUrl, getItemIconUrl } from '../../lib/riotAssets'
import { formatGameDuration, formatRelativeTime } from '../../lib/hexforge'
import { QUEUE_IDS } from '../../lib/constants'
import type { MatchParticipantEntry } from '../../types/dashboard'

type MatchRowProps = {
  entry: MatchParticipantEntry
  ddragonVersion: string | null
  showAgo?: boolean
}

const QUEUE_LABELS: Record<number, string> = {
  [QUEUE_IDS.SOLO]: 'CLASIF. SOLO',
  [QUEUE_IDS.FLEX]: 'CLASIF. FLEXIBLE',
  400: 'NORMAL',
  430: 'NORMAL',
  450: 'ARAM',
}

function getQueueLabel(queueId: number) {
  return QUEUE_LABELS[queueId] ?? 'PARTIDA'
}

export function MatchRow({ entry, ddragonVersion, showAgo = false }: MatchRowProps) {
  const color = entry.win ? 'var(--hf-win-blue)' : 'var(--hf-loss)'
  const kdaRatio = ((entry.kills + entry.assists) / Math.max(entry.deaths, 1)).toFixed(1)
  const csPerMin = (entry.csTotal / Math.max(entry.match.gameDuration / 60, 1)).toFixed(1)
  const championIconUrl = ddragonVersion ? getChampionIconUrl(entry.champion, ddragonVersion) : null
  const items = entry.itemIds.slice(0, 6)

  return (
    <div className={`match-row ${entry.win ? 'match-row--win' : 'match-row--loss'}`}>
      <div className="match-row-bar" style={{ background: color }} />

      {championIconUrl ? (
        <img className="avatar-img avatar-img--match" src={championIconUrl} alt={entry.champion} />
      ) : (
        <div className="avatar-tile avatar-tile--match">{entry.champion.slice(0, 2).toUpperCase()}</div>
      )}

      <div className="match-row-result-col">
        <div className="match-row-result" style={{ color }}>
          {entry.win ? 'VICTORIA' : 'DERROTA'}
        </div>
        <div className="match-row-sub">
          {getQueueLabel(entry.match.queueId)} · {formatGameDuration(entry.match.gameDuration)}
        </div>
        {showAgo && <div className="match-row-ago">{formatRelativeTime(entry.match.gameCreation)}</div>}
      </div>

      <div className="match-row-kda-col">
        <div className="match-row-kda">
          {entry.kills} / {entry.deaths} / {entry.assists}
        </div>
        <div className="match-row-kda-ratio">{kdaRatio} KDA</div>
      </div>

      <div className="match-row-cs-col">
        <div className="match-row-cs">
          {entry.csTotal} ({csPerMin})
        </div>
        <div className="match-row-vision">{entry.visionScore} visión</div>
      </div>

      <div className="match-row-damage-col">
        <div className="match-row-damage-head">
          <span>DAÑO</span>
          <span>{(entry.damageDealt / 1000).toFixed(1)}k</span>
        </div>
        <div className="match-row-damage-track">
          <div
            className="match-row-damage-fill"
            style={{
              width: `${entry.damagePercentile}%`,
              background: `linear-gradient(90deg, ${color}66, ${color})`,
            }}
          />
        </div>
      </div>

      <div className="match-row-items">
        {items.map((itemId, index) => {
          const iconUrl = ddragonVersion ? getItemIconUrl(itemId, ddragonVersion) : null
          return iconUrl ? (
            <img key={index} className="match-item-slot" src={iconUrl} alt="" />
          ) : (
            <div key={index} className="match-item-slot" />
          )
        })}
      </div>

      <div
        className="match-row-lp"
        style={{
          color:
            entry.lpDelta === null
              ? 'var(--hf-muted-6)'
              : entry.lpDelta >= 0
                ? 'var(--hf-win-green)'
                : 'var(--hf-loss)',
        }}
      >
        {entry.lpDelta === null ? '—' : `${entry.lpDelta >= 0 ? '+' : ''}${entry.lpDelta}`}
      </div>
    </div>
  )
}
