import { getChampionIconUrl } from '../../lib/riotAssets'
import { ROLE_LABELS } from '../../lib/goalLabels'
import type { BehaviorFlag, GoalPrefill } from '../../types/dashboard'

type DetectedErrorsSectionProps = {
  flags: BehaviorFlag[]
  ddragonVersion: string | null
  onCreateGoal: (flag: BehaviorFlag) => GoalPrefill
  onOpenGoalModal: (prefill: GoalPrefill) => void
}

const SEVERITY_LABELS: Record<BehaviorFlag['severity'], string> = {
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
}

export function DetectedErrorsSection({ flags, ddragonVersion, onCreateGoal, onOpenGoalModal }: DetectedErrorsSectionProps) {
  return (
    <div className="detected-errors">
      <div className="page-head-eyebrow">ERRORES DETECTADOS</div>

      {flags.length === 0 ? (
        <p className="empty-state">No detectamos errores puntuales en tus últimas partidas.</p>
      ) : (
        <div className="detected-errors-list">
          {flags.map((flag) => (
            <div key={`${flag.type}-${flag.role}-${flag.champion ?? ''}`} className="detected-error-row">
              <div className="detected-error-art">
                {flag.champion && ddragonVersion ? (
                  <img src={getChampionIconUrl(flag.champion, ddragonVersion)} alt={flag.champion} />
                ) : (
                  <div className="avatar-tile avatar-tile--sm">{ROLE_LABELS[flag.role]?.slice(0, 2).toUpperCase()}</div>
                )}
              </div>

              <div className="detected-error-info">
                <div className="detected-error-head">
                  <span className={`detected-error-badge detected-error-badge--${flag.severity}`}>
                    {SEVERITY_LABELS[flag.severity]}
                  </span>
                  <span className="detected-error-role">{ROLE_LABELS[flag.role] ?? flag.role}</span>
                </div>
                <p className="detected-error-narrative">{flag.narrative}</p>
              </div>

              <button
                type="button"
                className="secondary-btn detected-error-cta"
                onClick={() => onOpenGoalModal(onCreateGoal(flag))}
              >
                Crear objetivo
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
