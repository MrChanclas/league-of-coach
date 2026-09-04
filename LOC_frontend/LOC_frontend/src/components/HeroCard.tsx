import { formatCompactNumber, getLaneLabel, getNextRank, getTierColor } from '../lib/hexforge'
import { getRankEmblemUrl } from '../lib/riotAssets'
import type { AccountCard, AccountStatsSummary, LaneEntry, RankSnapshotEntry, StreakInfo } from '../types/dashboard'

type HeroCardProps = {
  account: AccountCard
  profileIconUrl: string | null
  primaryQueue: 'solo' | 'flex'
  statsSummary: AccountStatsSummary | null
  streak: StreakInfo | null
  lanes: LaneEntry[]
  rankHistory: RankSnapshotEntry[]
  masteryTotalPoints: number
}

export function HeroCard({
  account,
  profileIconUrl,
  primaryQueue,
  statsSummary,
  streak,
  lanes,
  rankHistory,
  masteryTotalPoints,
}: HeroCardProps) {
  const tier = primaryQueue === 'solo' ? account.soloTier : account.flexTier
  const division = primaryQueue === 'solo' ? account.soloDivision : account.flexDivision
  const lp = primaryQueue === 'solo' ? account.soloLp : account.flexLp
  const isRanked = tier !== 'Unranked'
  const tierColor = isRanked ? getTierColor(tier) : null
  const emblemUrl = isRanked ? getRankEmblemUrl(tier) : null
  const nextRank = isRanked ? getNextRank(tier, division) : null
  const progressPct = isRanked ? Math.min(100, Math.max(0, lp)) : 0

  const games = statsSummary?.gamesPlayed ?? 0
  const wins = statsSummary?.wins ?? 0
  const losses = games - wins
  const winratePct = statsSummary ? Math.round(statsSummary.winrate * 100) : 0

  const sortedHistory = [...rankHistory].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
  )
  const netLp =
    sortedHistory.length >= 2 ? sortedHistory[sortedHistory.length - 1].lp - sortedHistory[0].lp : null

  const primaryLane = lanes[0]

  return (
    <section className="hero-card">
      <div className="hero-grid">
        <div className="hero-tier-col">
          <div className="hero-tier-diamond">
            <div className="hero-tier-crest">
              {emblemUrl ? (
                <img className="rank-emblem" src={emblemUrl} alt={tier} />
              ) : (
                <div className="hero-tier-crest-fallback" />
              )}
            </div>
          </div>
          <div className="hero-tier-text">
            <div className="hero-tier-rank" style={{ color: tierColor ?? '#9aa0ac' }}>
              {isRanked ? `${tier} ${division}` : 'Sin clasificar'}
            </div>
            <div className="hero-tier-lp">
              {isRanked ? `${lp} LP · ` : ''}
              {primaryQueue === 'solo' ? 'SOLO/DÚO' : 'FLEXIBLE'}
            </div>
          </div>
          {isRanked && (
            <div className="hero-progress">
              <div className="hero-progress-track">
                <div
                  className="hero-progress-fill"
                  style={{
                    width: `${progressPct}%`,
                    background: `linear-gradient(90deg, #1d7f6a, ${tierColor ?? '#63dcb8'})`,
                  }}
                />
              </div>
              <div className="hero-progress-labels">
                <span>
                  {tier} {division}
                </span>
                <span>{nextRank ? `${nextRank.tier} ${nextRank.division}` : 'RANGO MÁXIMO'}</span>
              </div>
            </div>
          )}
        </div>

        <div className="hero-identity">
          <div className="hero-identity-row">
            {profileIconUrl ? (
              <img className="avatar-img avatar-img--lg" src={profileIconUrl} alt="" />
            ) : (
              <div className="avatar-tile avatar-tile--lg">{account.summoner.slice(0, 2).toUpperCase()}</div>
            )}
            <div className="hero-identity-main">
              <div className="hero-identity-name-row">
                <span className="hero-identity-name">{account.summoner}</span>
                <span className="hero-identity-tag">#{account.tag}</span>
                <span className="hero-badge-active">ACTIVA</span>
              </div>
              <div className="hero-identity-level">
                NIVEL {account.summonerLevel} · {account.server} · MAESTRÍA {formatCompactNumber(masteryTotalPoints)}
              </div>
            </div>
            <div className="hero-identity-wl">
              <div className="hero-wr-value">{winratePct}%</div>
              <div className="hero-wr-sub">
                {wins}V · {losses}D
              </div>
            </div>
          </div>

          <div className="hero-chart-box">
            <div className="hero-chart-head">
              <span className="hero-chart-label">LP · REGISTROS RECIENTES</span>
              {netLp !== null && (
                <span
                  className="hero-chart-netlp"
                  style={{ color: netLp >= 0 ? 'var(--hf-win-green)' : 'var(--hf-loss)' }}
                >
                  {netLp >= 0 ? '+' : ''}
                  {netLp} LP
                </span>
              )}
            </div>
            {sortedHistory.length >= 2 ? (
              <LpChart history={sortedHistory} />
            ) : (
              <div className="hero-chart-empty">
                Necesitás más sincronizaciones para graficar tu progreso de LP.
              </div>
            )}
          </div>

          <div className="hero-stats-grid">
            <div className="hero-stat">
              <div className="hero-stat-label">KDA PROMEDIO</div>
              <div className="hero-stat-value" style={{ color: '#e0dbcf' }}>
                {statsSummary ? statsSummary.avgKda.toFixed(2) : '—'}
              </div>
              <div className="hero-stat-sub">
                {statsSummary
                  ? `${statsSummary.avgKills.toFixed(1)} / ${statsSummary.avgDeaths.toFixed(1)} / ${statsSummary.avgAssists.toFixed(1)}`
                  : 'sin datos'}
              </div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">CS / MIN</div>
              <div className="hero-stat-value" style={{ color: 'var(--hf-win-green)' }}>
                {statsSummary ? statsSummary.avgCsPerMin.toFixed(1) : '—'}
              </div>
              <div className="hero-stat-sub">promedio reciente</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">RACHA</div>
              <div
                className="hero-stat-value"
                style={{ color: streak?.type === 'win' ? 'var(--hf-win-blue)' : 'var(--hf-loss)' }}
              >
                {streak && streak.type !== 'none' ? `${streak.count}${streak.type === 'win' ? 'V' : 'D'}` : '—'}
              </div>
              <div className="hero-stat-sub">partidas seguidas</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">LÍNEA</div>
              <div className="hero-stat-value" style={{ color: 'var(--hf-gold)' }}>
                {primaryLane ? getLaneLabel(primaryLane.lane) : '—'}
              </div>
              <div className="hero-stat-sub">
                {primaryLane ? `${Math.round(primaryLane.share * 100)}% de partidas` : 'sin datos'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function LpChart({ history }: { history: RankSnapshotEntry[] }) {
  const width = 620
  const height = 96
  const values = history.map((entry) => entry.lp)
  const min = Math.min(...values) - 12
  const max = Math.max(...values) + 12
  const range = Math.max(max - min, 1)
  const points = history.map((entry, index) => {
    const x = (index / (history.length - 1)) * width
    const y = height - ((entry.lp - min) / range) * (height - 8) - 4
    return [x, y] as const
  })
  const lpLine = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const lpArea = `M0,${height} L${lpLine.replace(/ /g, ' L')} L${width},${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="hero-chart-svg">
      <defs>
        <linearGradient id="hf-lp-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#63dcb8" stopOpacity="0.3" />
          <stop offset="1" stopColor="#63dcb8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1="24" x2={width} y2="24" stroke="rgba(255,255,255,.05)" strokeWidth="1" />
      <line x1="0" y1="60" x2={width} y2="60" stroke="rgba(255,255,255,.05)" strokeWidth="1" />
      <path d={lpArea} fill="url(#hf-lp-gradient)" />
      <polyline points={lpLine} fill="none" stroke="#63dcb8" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}
