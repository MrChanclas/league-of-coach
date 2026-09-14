import { getChampionIconUrl } from '../../lib/riotAssets'
import {
  MAX_CHAMPIONS_PER_ROLE,
  MIN_CHAMPIONS_PER_ROLE,
  PERFORMANCE_TIP_BAD_MESSAGE,
  PERFORMANCE_TIP_GOOD_MESSAGE,
  POOL_SLOT_LABELS,
  POOL_STATE_LABELS,
  getPoolSlotCaption,
  getPoolSlots,
} from '../../lib/poolLabels'
import type { ChampionPerformanceTip, PoolView } from '../../types/dashboard'

type PoolBoardProps = {
  poolView: PoolView
  ddragonVersion: string | null
  championsWithOpenLesson: Set<string>
  onOpenLesson: (championKey: string) => void
  onEditPool: () => void
  onAddOutsider: (championKey: string) => void
}

const MIN_GAMES_FOR_WINRATE = 3

function formatWinrate(gamesPlayed: number, winrate: number) {
  if (gamesPlayed < MIN_GAMES_FOR_WINRATE) return { label: '—', className: 'pool-wr pool-wr--muted' }
  const pct = Math.round(winrate * 100)
  return { label: `${pct}%`, className: pct >= 50 ? 'pool-wr pool-wr--win' : 'pool-wr pool-wr--loss' }
}

/** Per-champion "seguí así o cambiá" note — null once there isn't enough data yet to say either way. */
function PerformanceTip({
  performance,
  onAddSubstitute,
}: {
  performance: ChampionPerformanceTip
  onAddSubstitute: (championKey: string) => void
}) {
  if (performance.status === 'insufficient_data') return null
  if (performance.status === 'good') {
    return <span className="pool-performance-tip pool-performance-tip--good">✓ {PERFORMANCE_TIP_GOOD_MESSAGE}</span>
  }
  return (
    <div className="pool-performance-tip pool-performance-tip--bad">
      <span>{PERFORMANCE_TIP_BAD_MESSAGE}</span>
      {performance.substitute && (
        <button
          type="button"
          className="pool-performance-substitute"
          onClick={() => onAddSubstitute(performance.substitute!.championKey)}
        >
          Probar {performance.substitute.name} en su lugar
        </button>
      )}
    </div>
  )
}

function formatProvenance(pool: PoolView['pool']) {
  if (!pool) return ''
  const date = new Date(pool.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
  return pool.source === 'coach'
    ? `Armada con la recomendación del coach el ${date}`
    : `Armada a mano el ${date}`
}

export function PoolBoard({
  poolView,
  ddragonVersion,
  championsWithOpenLesson,
  onOpenLesson,
  onEditPool,
  onAddOutsider,
}: PoolBoardProps) {
  const { pool, roleProfile, entries, outsiders, health } = poolView

  const groups = getPoolSlots(roleProfile).map((role) => ({
    role,
    entries: entries.filter((entry) => entry.role === role).sort((a, b) => a.position - b.position),
  })).filter((group) => group.entries.length > 0)

  return (
    <div className="view-content pool-board">
      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">POOL CHAMP · {entries.length} CAMPEONES</div>
          <h1>Tu pool</h1>
          <p>{formatProvenance(pool)}</p>
        </div>
        <div className="pool-board-actions">
          <button type="button" className="secondary-btn" onClick={onEditPool}>
            Revisar recomendación
          </button>
          <button type="button" className="primary-btn" onClick={onEditPool}>
            + Agregar campeón
          </button>
        </div>
      </div>

      <div className="pool-board-grid">
        <div className="pool-board-groups">
          {groups.map((group) => (
            <div key={group.role} className="pool-role-group">
              <div className="pool-role-group-head">
                <span className="pool-role-group-title">
                  {POOL_SLOT_LABELS[group.role].toUpperCase()} · {getPoolSlotCaption(group.role, roleProfile).toUpperCase()}
                </span>
                <span className="pool-role-group-hairline" />
                {group.entries.length < MIN_CHAMPIONS_PER_ROLE && (
                  <span className="pool-role-group-warn">
                    Faltan {MIN_CHAMPIONS_PER_ROLE - group.entries.length} para que sea válido
                  </span>
                )}
                <span className="pool-role-group-count">
                  {group.entries.length}/{MAX_CHAMPIONS_PER_ROLE}
                </span>
              </div>

              <div className="pool-role-group-rows">
                {group.entries.map((entry) => {
                  const wr = formatWinrate(entry.gamesPlayed, entry.winrate)
                  const hasLesson = championsWithOpenLesson.has(entry.championKey)
                  return (
                    <div
                      key={entry.championKey}
                      className={entry.state === 'main' ? 'pool-champion-row pool-champion-row--main' : 'pool-champion-row'}
                    >
                      <div className="pool-champion-art">
                        {ddragonVersion ? (
                          <img src={getChampionIconUrl(entry.championKey, ddragonVersion)} alt={entry.name} />
                        ) : (
                          <div className="avatar-tile avatar-tile--sm">{entry.name.slice(0, 2).toUpperCase()}</div>
                        )}
                      </div>

                      <div className="pool-champion-identity">
                        <span className="pool-champion-name">{entry.name}</span>
                        <span className={`pool-state-badge pool-state-badge--${entry.state}`}>
                          {POOL_STATE_LABELS[entry.state]}
                        </span>
                      </div>

                      <div className="pool-champion-note">{entry.note ?? ''}</div>

                      <div className="pool-champion-stats">
                        <span className={wr.className}>{wr.label}</span>
                        <span className="pool-champion-games">{entry.gamesPlayed} PARTIDAS</span>
                      </div>

                      {hasLesson ? (
                        <button type="button" className="pool-guide-link" onClick={() => onOpenLesson(entry.championKey)}>
                          Ver guía ›
                        </button>
                      ) : (
                        <span className="pool-guide-link pool-guide-link--muted">Sin guía</span>
                      )}

                      <PerformanceTip performance={entry.performance} onAddSubstitute={onAddOutsider} />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="pool-board-aside">
          <div className="pool-health-card">
            <div className="pool-health-head">
              {health.score != null ? (
                <div
                  className="pool-health-ring"
                  style={{
                    background: `conic-gradient(var(--hf-gold) 0 ${health.score}%, rgba(255,255,255,.07) ${health.score}% 100%)`,
                  }}
                >
                  <div className="pool-health-ring-inner">{health.score}</div>
                </div>
              ) : null}
              <div className="pool-health-title">Salud del pool</div>
            </div>

            <div className="pool-health-notes">
              <div className="pool-health-note">
                <span className="pool-health-dot pool-health-dot--coverage" />
                {health.coverage.label}
              </div>
              <div className="pool-health-note">
                <span className="pool-health-dot pool-health-dot--concentration" />
                {health.concentration.label}
              </div>
              <div className="pool-health-note">
                <span className="pool-health-dot pool-health-dot--testing" />
                {health.testing.label}
              </div>
            </div>
          </div>

          {outsiders.length > 0 && (
            <div className="pool-outsiders-card">
              <div className="pool-outsiders-title">FUERA DEL POOL</div>
              {outsiders.map((outsider) => {
                const wr = formatWinrate(outsider.gamesPlayed, outsider.winrate)
                return (
                  <div key={outsider.championKey} className="pool-outsider-block">
                    <div className="pool-outsider-row">
                      <div className="pool-champion-art pool-champion-art--sm">
                        {ddragonVersion ? (
                          <img src={getChampionIconUrl(outsider.championKey, ddragonVersion)} alt={outsider.name} />
                        ) : (
                          <div className="avatar-tile avatar-tile--xs">{outsider.name.slice(0, 2).toUpperCase()}</div>
                        )}
                      </div>
                      <div className="pool-outsider-info">
                        <span className="pool-outsider-name">{outsider.name}</span>
                        <span className="pool-outsider-meta">
                          <span className={wr.className}>{wr.label}</span> · {outsider.gamesPlayed} partidas
                        </span>
                      </div>
                      <button type="button" className="pool-outsider-add" onClick={() => onAddOutsider(outsider.championKey)}>
                        + Sumar
                      </button>
                    </div>
                    <PerformanceTip performance={outsider.performance} onAddSubstitute={onAddOutsider} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
