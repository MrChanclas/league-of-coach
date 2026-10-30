import { useAccountsQueueStats } from '../../hooks/useApiQueries'
import { formatRank, getTierColor } from '../../lib/hexforge'
import { getProfileIconUrl, getRankEmblemUrl } from '../../lib/riotAssets'
import { formatQueueWinrate, getOrderedQueues } from '../../lib/accounts'
import type { AccountsGridProps } from '../../types/components'

export function AccountsGrid({
  userAccounts,
  currentAccountId,
  ddragonVersion,
  onSetCurrentAccountId,
  onDeleteAccount,
}: AccountsGridProps) {
  const queueStatsQuery = useAccountsQueueStats(userAccounts)
  const queueStatsByAccount = queueStatsQuery.data ?? {}

  const handleDeleteClick = (event: React.MouseEvent, account: AccountsGridProps['userAccounts'][0]) => {
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
                          <img className="rank-emblem rank-emblem--chip" src={emblemUrl} alt={formatRank(queue.tier, queue.division)} />
                        ) : (
                          <div className="rank-emblem rank-emblem--chip rank-emblem--unranked" />
                        )}
                        <div className="queue-info">
                          <div className="queue-name">{queue.label}</div>
                          <div className="queue-tier" style={{ color: tierColor ?? 'var(--hf-muted-4)' }}>
                            {queue.tier === 'Unranked' ? 'SIN CLASIFICAR' : formatRank(queue.tier, queue.division)}
                          </div>
                        </div>
                        <div className="queue-side">
                          {queue.tier !== 'Unranked' && <div className="queue-lp">{queue.lp} LP</div>}
                          <div className="queue-wr">{formatQueueWinrate(queue.summary)}</div>
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
