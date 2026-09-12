import { getLaneLabel, getNextRank, getTierColor } from '../../lib/hexforge'
import { getRankEmblemUrl } from '../../lib/riotAssets'
import type { AccountCard, AccountStatsSummary, LaneEntry, StreakInfo } from '../../types/dashboard'

type AccountBandProps = {
  account: AccountCard
  primaryQueue: 'solo' | 'flex'
  statsSummary: AccountStatsSummary | null
  streak: StreakInfo | null
  lanes: LaneEntry[]
}

/** Compact ~100px account summary — replaces the old 216px hero (see handoff_loc/06-coaching.md, 4A). */
export function AccountBand({ account, primaryQueue, statsSummary, streak, lanes }: AccountBandProps) {
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
  const primaryLane = lanes[0]

  return (
    <section className="account-band" data-tour="hero">
      <div className="account-band-glow" />
      <div className="account-band-inner">
        <div className="account-band-diamond">
          <div className="account-band-crest">
            {emblemUrl ? (
              <img className="rank-emblem" src={emblemUrl} alt={tier} />
            ) : (
              <div className="account-band-crest-fallback" />
            )}
          </div>
        </div>

        <div className="account-band-identity">
          <div className="account-band-identity-row">
            <span className="account-band-name">{account.summoner}</span>
            <span className="account-band-tag">#{account.tag}</span>
            <span className="account-band-badge">ACTIVA</span>
          </div>
          <div className="account-band-tier" style={{ color: tierColor ?? '#9aa0ac' }}>
            {isRanked ? `${tier} ${division}` : 'Sin clasificar'}
          </div>
          <div className="account-band-sub">
            {isRanked ? `${lp} LP · ` : ''}
            {primaryQueue === 'solo' ? 'SOLO/DÚO' : 'FLEXIBLE'} · NIVEL {account.summonerLevel}
          </div>
        </div>

        <div className="account-band-progress">
          {isRanked ? (
            <>
              <div className="account-band-progress-track">
                <div
                  className="account-band-progress-fill"
                  style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, #1d7f6a, ${tierColor ?? '#63dcb8'})` }}
                />
              </div>
              <div className="account-band-progress-labels">
                <span>{tier} {division}</span>
                <span className="account-band-progress-next">
                  {nextRank ? `${nextRank.tier} ${nextRank.division}` : 'RANGO MÁXIMO'}
                </span>
              </div>
            </>
          ) : (
            <div className="account-band-progress-empty">Sin partidas clasificatorias</div>
          )}
        </div>

        <div className="account-band-winrate">
          <div className="account-band-winrate-value">{winratePct}%</div>
          <div className="account-band-winrate-sub">
            {wins}V · {losses}D
          </div>
        </div>

        <div className="account-band-metrics">
          <div className="account-band-metric">
            <div className="account-band-metric-label">KDA PROM.</div>
            <div className="account-band-metric-value" style={{ color: '#e0dbcf' }}>
              {statsSummary ? statsSummary.avgKda.toFixed(2) : '—'}
            </div>
            <div className="account-band-metric-sub">
              {statsSummary
                ? `${statsSummary.avgKills.toFixed(1)}/${statsSummary.avgDeaths.toFixed(1)}/${statsSummary.avgAssists.toFixed(1)}`
                : 'sin datos'}
            </div>
          </div>
          <div className="account-band-metric">
            <div className="account-band-metric-label">CS / MIN</div>
            <div className="account-band-metric-value" style={{ color: 'var(--hf-win-green)' }}>
              {statsSummary ? statsSummary.avgCsPerMin.toFixed(1) : '—'}
            </div>
            <div className="account-band-metric-sub">promedio</div>
          </div>
          <div className="account-band-metric">
            <div className="account-band-metric-label">RACHA</div>
            <div
              className="account-band-metric-value"
              style={{ color: streak?.type === 'win' ? 'var(--hf-win-blue)' : 'var(--hf-loss)' }}
            >
              {streak && streak.type !== 'none' ? `${streak.count}${streak.type === 'win' ? 'V' : 'D'}` : '—'}
            </div>
            <div className="account-band-metric-sub">partidas</div>
          </div>
          <div className="account-band-metric">
            <div className="account-band-metric-label">LÍNEA</div>
            <div className="account-band-metric-value" style={{ color: 'var(--hf-gold)' }}>
              {primaryLane ? getLaneLabel(primaryLane.lane) : '—'}
            </div>
            <div className="account-band-metric-sub">
              {primaryLane ? `${Math.round(primaryLane.share * 100)}%` : 'sin datos'}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
