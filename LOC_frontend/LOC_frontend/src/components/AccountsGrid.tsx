import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { fetchJson } from '../lib/api'
import { getTierColor } from '../lib/hexforge'
import { getProfileIconUrl, getRankEmblemUrl } from '../lib/riotAssets'
import type { AccountCard, AccountStatsSummary } from '../types/dashboard'

type AccountsGridProps = {
  userAccounts: AccountCard[]
  currentAccountId: string
  ddragonVersion: string | null
  onSetCurrentAccountId: (id: string) => void
  onDeleteAccount: (accountId: string) => void
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
    label: 'SOLO/DÚO',
    tier: account.soloTier,
    division: account.soloDivision,
    lp: account.soloLp,
    summary: stats?.solo ?? null,
  }
  const flex: QueueInfo = {
    key: 'flex',
    label: 'FLEXIBLE',
    tier: account.flexTier,
    division: account.flexDivision,
    lp: account.flexLp,
    summary: stats?.flex ?? null,
  }

  return account.soloTier !== 'Unranked' ? [solo, flex] : [flex, solo]
}

function formatWinrate(summary: AccountStatsSummary | null) {
  if (!summary || summary.gamesPlayed === 0) return '0 J'
  return `${Math.round(summary.winrate * 100)}% WR · ${summary.gamesPlayed} J`
}

export function AccountsGrid({
  userAccounts,
  currentAccountId,
  ddragonVersion,
  onSetCurrentAccountId,
  onDeleteAccount,
}: AccountsGridProps) {
  const { getToken } = useAuth()
  const [queueStatsByAccount, setQueueStatsByAccount] = useState<Record<string, QueueStats>>({})

  useEffect(() => {
    if (userAccounts.length === 0) return

    let cancelled = false

    const loadQueueStats = async () => {
      const token = await getToken()
      const entries = await Promise.all(
        userAccounts.map(async (account) => {
          const [solo, flex] = await Promise.all([
            fetchJson<AccountStatsSummary>(`/stats/account/${account.id}/by-queue/${SOLO_QUEUE_ID}`, token),
            fetchJson<AccountStatsSummary>(`/stats/account/${account.id}/by-queue/${FLEX_QUEUE_ID}`, token),
          ])
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

  const handleDeleteClick = (event: React.MouseEvent, account: AccountCard) => {
    event.stopPropagation()
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar la cuenta "${account.summoner}#${account.tag}"? Esto también borra sus partidas, objetivos y aprendizaje guardados.`,
    )
    if (confirmed) {
      onDeleteAccount(account.id)
    }
  }

  const classifiedCount = userAccounts.filter((account) => account.soloTier !== 'Unranked').length

  return (
    <section>
      <div className="section-head">
        <h2>TODAS LAS CUENTAS</h2>
        <span>
          {userAccounts.length} PERFILES · {classifiedCount} CLASIFICADAS
        </span>
      </div>

      {userAccounts.length === 0 ? (
        <p className="empty-state">
          No hay cuentas detectadas todavía. Usa &quot;+ Vincular cuenta Riot&quot; para buscar una cuenta real y
          empezar a entrenar.
        </p>
      ) : (
        <div className="accounts-grid">
          {userAccounts.map((account) => {
            const iconUrl =
              ddragonVersion && account.profileIconId > 0
                ? getProfileIconUrl(account.profileIconId, ddragonVersion)
                : null
            const queues = getOrderedQueues(account, queueStatsByAccount[account.id])
            const isActive = account.id === currentAccountId

            return (
              <button
                key={account.id}
                type="button"
                className={isActive ? 'account-tile account-tile--active' : 'account-tile'}
                onClick={() => onSetCurrentAccountId(account.id)}
              >
                <div className="account-tile-head">
                  {iconUrl ? (
                    <img className="avatar-img avatar-img--md" src={iconUrl} alt="" />
                  ) : (
                    <div className="avatar-tile avatar-tile--md">{account.summoner.slice(0, 2).toUpperCase()}</div>
                  )}
                  <div className="sidebar-account-text">
                    <div className="account-tile-name">{account.summoner}</div>
                    <div className="account-tile-region">
                      {account.server} · #{account.tag}
                    </div>
                  </div>
                  <span
                    className="account-tile-delete"
                    role="button"
                    tabIndex={0}
                    aria-label={`Eliminar cuenta ${account.summoner}`}
                    title="Eliminar cuenta"
                    onClick={(event) => handleDeleteClick(event, account)}
                  >
                    ×
                  </span>
                </div>

                <div className="account-tile-queues">
                  {queues.map((queue) => {
                    const emblemUrl = getRankEmblemUrl(queue.tier)
                    const tierColor = getTierColor(queue.tier)

                    return (
                      <div key={queue.key} className="queue-row">
                        {emblemUrl ? (
                          <img className="rank-emblem rank-emblem--chip" src={emblemUrl} alt={queue.tier} />
                        ) : (
                          <div className="rank-emblem rank-emblem--chip rank-emblem--unranked" />
                        )}
                        <div className="queue-info">
                          <div className="queue-name">{queue.label}</div>
                          <div className="queue-tier" style={{ color: tierColor ?? 'var(--hf-muted-4)' }}>
                            {queue.tier === 'Unranked' ? 'SIN CLASIFICAR' : `${queue.tier} ${queue.division}`}
                          </div>
                        </div>
                        <div className="queue-side">
                          {queue.tier !== 'Unranked' && <div className="queue-lp">{queue.lp} LP</div>}
                          <div className="queue-wr">{formatWinrate(queue.summary)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
