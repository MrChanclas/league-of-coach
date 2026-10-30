import { getChampionIconUrl } from '../../lib/riotAssets'
import { POOL_PROMO_FAN_ROLES, POOL_ROLE_LABELS } from '../../constants'
import type { RosterChampion } from '../../types/dashboard'
import type { PoolChampPromoCardProps } from '../../types/components'

/** Promo block shown in the home (4A) while the account has no pool yet — see handoff_loc/07-pool-champ.md. */
export function PoolChampPromoCard({ roster, ddragonVersion, onArmarPool, onVerDelCoach }: PoolChampPromoCardProps) {
  const fanChampions = POOL_PROMO_FAN_ROLES.map((role) => roster.find((champion) => champion.role === role)).filter(
    (champion): champion is RosterChampion => Boolean(champion),
  )

  return (
    <section className="pool-promo">
      <div className="pool-promo-glow" />
      <div className="pool-promo-main">
        <div className="pool-promo-badge">NUEVO</div>
        <div className="pool-promo-eyebrow">POOL CHAMP</div>
        <h3>Arma tu pool y las lecciones se afinan</h3>
        <p>
          Con un pool declarado dejamos de promediar todos tus campeones y priorizamos el análisis en los que de
          verdad juegas.
        </p>
        <div className="pool-promo-actions">
          <button type="button" className="primary-btn" onClick={onArmarPool}>
            Armar mi pool
          </button>
          <button type="button" className="secondary-btn" onClick={onVerDelCoach}>
            Ver la del coach
          </button>
        </div>
      </div>

      <div className="pool-promo-fan">
        {fanChampions.map((champion) => (
          <div key={champion.championKey} className="pool-promo-portrait">
            {ddragonVersion ? (
              <img src={getChampionIconUrl(champion.championKey, ddragonVersion)} alt={champion.name} />
            ) : (
              <div className="avatar-tile avatar-tile--lg">{champion.name.slice(0, 2).toUpperCase()}</div>
            )}
            <span>{POOL_ROLE_LABELS[champion.role]}</span>
          </div>
        ))}
        <div className="pool-promo-portrait pool-promo-portrait--ghost">
          <div className="pool-promo-ghost-count">+2</div>
        </div>
      </div>
    </section>
  )
}
