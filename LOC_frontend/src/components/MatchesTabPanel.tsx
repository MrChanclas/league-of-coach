import { useMemo, useState } from 'react'
import { MatchRow } from './MatchRow'
import type { AccountCard, AccountStatsSummary, MatchParticipantEntry, RankSnapshotEntry, StreakInfo } from '../types/dashboard'

type MatchesTabPanelProps = {
  activeAccount?: AccountCard
  matches: MatchParticipantEntry[]
  statsSummary: AccountStatsSummary | null
  streak: StreakInfo | null
  rankHistory: RankSnapshotEntry[]
  ddragonVersion: string | null
}

type QueueFilter = 'all' | 420 | 440

const FILTERS: { key: QueueFilter; label: string }[] = [
  { key: 'all', label: 'Solo/dúo + Flexible' },
  { key: 420, label: 'Clasif. solo/dúo' },
  { key: 440, label: 'Flexible' },
]

function matchesFilter(entry: MatchParticipantEntry, filter: QueueFilter) {
  if (filter === 'all') return true
  return entry.match.queueId === filter
}

export function MatchesTabPanel({
  activeAccount,
  matches,
  statsSummary,
  streak,
  rankHistory,
  ddragonVersion,
}: MatchesTabPanelProps) {
  const [filter, setFilter] = useState<QueueFilter>('all')

  const filteredMatches = useMemo(() => matches.filter((entry) => matchesFilter(entry, filter)), [matches, filter])

  if (!activeAccount) {
    return (
      <div className="view-content">
        <div className="page-head">
          <div>
            <h1>Historial de partidas</h1>
            <p>Agregá una cuenta de Riot en la pestaña &quot;Cuentas&quot; para ver tu historial de partidas.</p>
          </div>
        </div>
      </div>
    )
  }

  const sortedHistory = [...rankHistory].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
  )
  const netLp =
    sortedHistory.length >= 2 ? sortedHistory[sortedHistory.length - 1].lp - sortedHistory[0].lp : null

  const winratePct = statsSummary ? Math.round(statsSummary.winrate * 100) : 0
  const kdaValue = statsSummary ? statsSummary.avgKda : 0
  const streakLabel = streak && streak.type !== 'none' ? `${streak.count}${streak.type === 'win' ? 'V' : 'D'}` : '—'

  const aggStats = [
    {
      label: `WINRATE · ${statsSummary?.gamesPlayed ?? 0} PARTIDAS`,
      big: `${winratePct}%`,
      detail: statsSummary ? `${statsSummary.wins}V · ${statsSummary.gamesPlayed - statsSummary.wins}D` : 'sin datos',
      color: 'var(--hf-win-blue)',
      pct: winratePct,
    },
    {
      label: 'KDA PROMEDIO',
      big: kdaValue.toFixed(2),
      detail: statsSummary
        ? `${statsSummary.avgKills.toFixed(1)} / ${statsSummary.avgDeaths.toFixed(1)} / ${statsSummary.avgAssists.toFixed(1)} por partida`
        : 'sin datos',
      color: 'var(--hf-win-green)',
      pct: Math.min(100, Math.round(kdaValue * 20)),
    },
    {
      label: 'LP NETO DEL SPLIT',
      big: netLp !== null ? `${netLp >= 0 ? '+' : ''}${netLp}` : '—',
      detail: `Racha actual: ${streakLabel}`,
      color: 'var(--hf-gold)',
      pct: netLp !== null ? Math.min(100, Math.abs(netLp)) : 0,
    },
  ]

  return (
    <div className="view-content">
      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">
            {activeAccount.summoner} #{activeAccount.tag}
          </div>
          <h1>Historial de partidas</h1>
        </div>
      </div>

      <div className="filter-pills">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={filter === item.key ? 'filter-pill active' : 'filter-pill'}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="agg-stats-grid">
        {aggStats.map((stat) => (
          <div key={stat.label} className="agg-stat-card">
            <div
              className="agg-ring"
              style={{ background: `conic-gradient(${stat.color} 0 ${stat.pct}%, rgba(255,255,255,.07) ${stat.pct}% 100%)` }}
            >
              <div className="agg-ring-inner" style={{ color: stat.color }}>
                {stat.big}
              </div>
            </div>
            <div>
              <div className="agg-stat-label">{stat.label}</div>
              <div className="agg-stat-detail">{stat.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <section className="matches-panel">
        {filteredMatches.length === 0 ? (
          <p className="matches-empty">No hay partidas sincronizadas que coincidan con este filtro.</p>
        ) : (
          filteredMatches.map((entry) => (
            <MatchRow key={entry.id} entry={entry} ddragonVersion={ddragonVersion} showAgo />
          ))
        )}
      </section>
    </div>
  )
}
