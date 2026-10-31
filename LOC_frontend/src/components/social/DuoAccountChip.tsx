import { formatRank } from '../../lib/hexforge'
import { getProfileIconUrl } from '../../lib/riotAssets'
import type { DuoAccountChipProps } from '../../types/components'

/** A player's public identity in the social panel: icon, Riot ID and rank. */
export function DuoAccountChip({ account, ddragonVersion }: DuoAccountChipProps) {
  const isRanked = account.tier !== 'Unranked'
  return (
    <div className="duo-chip">
      {ddragonVersion && account.profileIconId > 0 ? (
        <img
          className="avatar-img avatar-img--md"
          src={getProfileIconUrl(account.profileIconId, ddragonVersion)}
          alt=""
        />
      ) : (
        <div className="avatar-tile avatar-tile--md">{account.summoner.slice(0, 2).toUpperCase()}</div>
      )}
      <div className="duo-chip-text">
        <div className="duo-chip-name">
          {account.summoner} <span className="duo-chip-tag">#{account.tag}</span>
        </div>
        <div className="duo-chip-rank">
          {isRanked ? `${formatRank(account.tier, account.division)} · ${account.lp} LP` : 'Sin clasificar'} ·{' '}
          {account.server}
        </div>
      </div>
    </div>
  )
}
