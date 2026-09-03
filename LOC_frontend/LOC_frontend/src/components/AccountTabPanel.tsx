import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { API_URL } from '../lib/api'
import { getDdragonVersion, getProfileIconUrl, getRankEmblemUrl } from '../lib/riotAssets'
import type { AccountCard, AccountStatsSummary } from '../types/dashboard'

type AccountTabPanelProps = {
  userAccounts: AccountCard[]
  activeAccount?: AccountCard
  currentAccountId: string
  onSetCurrentAccountId: (id: string) => void
  onDeleteAccount: (accountId: string) => void
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

type QueueStats = {
  solo: AccountStatsSummary | null
  flex: AccountStatsSummary | null
}

type QueueInfo = {
  key: 'solo' | 'flex'
  label: string
  tier: string
  division: string
  lp: number
  summary: AccountStatsSummary | null
}

const SOLO_QUEUE_ID = 420
const FLEX_QUEUE_ID = 440

function getOrderedQueues(account: AccountCard, stats?: QueueStats): QueueInfo[] {
  const solo: QueueInfo = {
    key: 'solo',
    label: 'Solo/Dúo',
    tier: account.soloTier,
    division: account.soloDivision,
    lp: account.soloLp,
    summary: stats?.solo ?? null,
  }
  const flex: QueueInfo = {
    key: 'flex',
    label: 'Flexible',
    tier: account.flexTier,
    division: account.flexDivision,
    lp: account.flexLp,
    summary: stats?.flex ?? null,
  }

  return account.soloTier !== 'Unranked' ? [solo, flex] : [flex, solo]
}

function formatWinrate(summary: AccountStatsSummary | null) {
  if (!summary || summary.gamesPlayed === 0) return 'Sin partidas sincronizadas'
  return `${Math.round(summary.winrate * 100)}% WR (${summary.wins}V/${summary.gamesPlayed - summary.wins}D)`
}

export function AccountTabPanel({
  userAccounts,
  activeAccount,
  currentAccountId,
  onSetCurrentAccountId,
  onDeleteAccount,
}: AccountTabPanelProps) {
  const { getToken } = useAuth()
  const [ddragonVersion, setDdragonVersion] = useState<string | null>(null)
  const [queueStatsByAccount, setQueueStatsByAccount] = useState<Record<string, QueueStats>>({})

  useEffect(() => {
    void getDdragonVersion().then(setDdragonVersion)
  }, [])

  const handleDeleteClick = (account: AccountCard) => {
    const confirmed = window.confirm(`¿Seguro que querés eliminar la cuenta "${account.summoner}#${account.tag}"? Esto también borra sus partidas, objetivos y aprendizaje guardados.`)
    if (confirmed) {
      onDeleteAccount(account.id)
    }
  }

  useEffect(() => {
    if (userAccounts.length === 0) return

    let cancelled = false

    const loadQueueStats = async () => {
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined

      const entries = await Promise.all(
        userAccounts.map(async (account) => {
          const [soloResponse, flexResponse] = await Promise.all([
            fetch(`${API_URL}/stats/account/${account.id}/by-queue/${SOLO_QUEUE_ID}`, { headers }),
            fetch(`${API_URL}/stats/account/${account.id}/by-queue/${FLEX_QUEUE_ID}`, { headers }),
          ])

          const solo = soloResponse.ok ? ((await soloResponse.json()) as AccountStatsSummary) : null
          const flex = flexResponse.ok ? ((await flexResponse.json()) as AccountStatsSummary) : null

          return [account.id, { solo, flex }] as const
        }),
      )

      if (!cancelled) {
        setQueueStatsByAccount(Object.fromEntries(entries))
      }
    }

    void loadQueueStats()

    return () => {
      cancelled = true
    }
  }, [userAccounts, getToken])

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
          <p>No hay cuentas detectadas todavía. Usa "+ Nueva cuenta Riot" para buscar una cuenta real y empezar a entrenar.</p>
        ) : (
          userAccounts.map((account) => {
            const iconUrl = ddragonVersion && account.profileIconId > 0
              ? getProfileIconUrl(account.profileIconId, ddragonVersion)
              : null
            const queues = getOrderedQueues(account, queueStatsByAccount[account.id])

            return (
              <article key={account.id} className="info-card account-card">
                <div className="info-card-head">
                  <div className="account-identity">
                    {iconUrl ? (
                      <img className="account-icon" src={iconUrl} alt="" />
                    ) : (
                      <span className="account-icon account-icon--placeholder">
                        {account.summoner.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <h4>{account.summoner}</h4>
                      <small>{account.server} • #{account.tag}</small>
                    </div>
                  </div>
                  <div className="account-card-actions">
                    {activeAccount?.id === account.id && <span className="tier-badge">Activa</span>}
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      onClick={() => handleDeleteClick(account)}
                      aria-label={`Eliminar cuenta ${account.summoner}`}
                      title="Eliminar cuenta"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>

                <div className="queue-row">
                  {queues.map((queue) => {
                    const emblemUrl = getRankEmblemUrl(queue.tier)

                    return (
                      <div key={queue.key} className="queue-card">
                        {emblemUrl ? (
                          <img className="rank-emblem" src={emblemUrl} alt={queue.tier} />
                        ) : (
                          <div className="rank-emblem rank-emblem--unranked" />
                        )}
                        <div>
                          <span>{queue.label}</span>
                          <strong>
                            {queue.tier === 'Unranked' ? 'Sin clasificar' : `${queue.tier} ${queue.division}`}
                          </strong>
                          {queue.tier !== 'Unranked' && <small>{queue.lp} LP</small>}
                          <small className="queue-winrate">{formatWinrate(queue.summary)}</small>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}
