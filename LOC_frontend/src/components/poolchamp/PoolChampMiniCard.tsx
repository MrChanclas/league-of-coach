import { getChampionIconUrl } from '../../lib/riotAssets'
import { POOL_ROLE_LABELS, POOL_STATE_LABELS } from '../../lib/poolLabels'
import type { PoolEntry, PoolRoleKey } from '../../types/dashboard'

type PoolChampMiniCardProps = {
  entries: PoolEntry[]
  mainRole: PoolRoleKey | undefined
  ddragonVersion: string | null
  onGoToPoolChamp: () => void
}

const PREVIEW_LIMIT = 6

/**
 * Replaces PoolChampPromoCard in the home once the account already has a
 * pool — shows the champions declared for the player's main lane instead of
 * leaving that slot empty (see handoff_loc/07-pool-champ.md coverage note:
 * "2 de 5 campeones sin datos suficientes" as the kind of permanent, honest
 * status this spot should carry once the promo no longer applies).
 */
export function PoolChampMiniCard({ entries, mainRole, ddragonVersion, onGoToPoolChamp }: PoolChampMiniCardProps) {
  const roleEntries = entries.filter((entry) => entry.role === mainRole).sort((a, b) => a.position - b.position)
  const roleLabel = mainRole ? POOL_ROLE_LABELS[mainRole] : null

  return (
    <div className="side-card pool-mini-preview">
      <div className="side-card-label">TU POOL{roleLabel ? ` · ${roleLabel.toUpperCase()}` : ''}</div>

      {roleEntries.length === 0 ? (
        <p className="pool-mini-preview-empty">
          {roleLabel
            ? `Todavía no declaraste campeones de ${roleLabel.toLowerCase()} en tu pool.`
            : 'Todavía no declaraste campeones para tu línea principal.'}
        </p>
      ) : (
        <div className="pool-mini-preview-rows">
          {roleEntries.slice(0, PREVIEW_LIMIT).map((entry) => (
            <div key={entry.championKey} className="pool-mini-preview-row">
              {ddragonVersion ? (
                <img
                  className="avatar-img avatar-img--sm"
                  src={getChampionIconUrl(entry.championKey, ddragonVersion)}
                  alt={entry.name}
                />
              ) : (
                <div className="avatar-tile avatar-tile--sm">{entry.name.slice(0, 2).toUpperCase()}</div>
              )}
              <span className="pool-mini-preview-name">{entry.name}</span>
              <span className={`pool-state-badge pool-state-badge--${entry.state}`}>{POOL_STATE_LABELS[entry.state]}</span>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="pool-mini-preview-link" onClick={onGoToPoolChamp}>
        Ver pool completo ›
      </button>
    </div>
  )
}
