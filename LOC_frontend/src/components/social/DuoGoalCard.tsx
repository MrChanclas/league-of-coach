import { useState } from 'react'
import { APEX_TIERS, DUO_GOAL_TIERS, RANK_DIVISIONS } from '../../constants'
import { formatRank, formatTier } from '../../lib/hexforge'
import type { DuoGoalCardProps, DuoGoalProgressLineProps } from '../../types/components'

function ProgressLine({ label, progress }: DuoGoalProgressLineProps) {
  return (
    <div className="duo-goal-line">
      <div className="duo-goal-line-head">
        <span>{label}</span>
        <span>
          {progress.completed
            ? 'Cumplido'
            : progress.lpRemaining != null
              ? `${progress.lpRemaining} LP restantes`
              : 'Sin clasificar'}
        </span>
      </div>
      <div className="goal-row-track">
        <div
          className={progress.completed ? 'goal-row-fill goal-row-fill--completed' : 'goal-row-fill'}
          style={{ width: `${progress.progress}%` }}
        />
      </div>
    </div>
  )
}

/** The shared rank goal: both partners reach it in the duo's queue. */
export function DuoGoalCard({ detail, isSaving, onSave, onRemove }: DuoGoalCardProps) {
  const { goal } = detail
  const [isEditing, setIsEditing] = useState(false)
  const [tier, setTier] = useState<string>(goal?.targetTier ?? 'DIAMOND')
  const [division, setDivision] = useState<string>(goal?.targetDivision ?? 'IV')
  const isApex = APEX_TIERS.has(tier)
  const isEnded = Boolean(detail.endedAt)

  return (
    <section className="social-card">
      <div className="social-card-head">
        <div>
          <div className="social-card-eyebrow">OBJETIVO DEL DUO</div>
          <h2>{goal ? `Llegar juntos a ${formatRank(goal.targetTier, goal.targetDivision ?? '')}` : 'Sin objetivo'}</h2>
        </div>
        {!isEnded && !isEditing && (
          <button type="button" className="link-btn" onClick={() => setIsEditing(true)}>
            {goal ? 'Cambiar' : 'Fijar objetivo'}
          </button>
        )}
      </div>

      {goal && !isEditing && (
        <>
          <ProgressLine label={`Tú (${detail.me.summoner})`} progress={goal.me} />
          <ProgressLine label={detail.partner.summoner} progress={goal.partner} />
        </>
      )}

      {!goal && !isEditing && (
        <p className="duo-muted">Un objetivo común les da una meta concreta para cada sesión juntos.</p>
      )}

      {isEditing && (
        <form
          className="duo-goal-form"
          onSubmit={(event) => {
            event.preventDefault()
            onSave({ targetTier: tier, targetDivision: isApex ? undefined : division })
            setIsEditing(false)
          }}
        >
          <select value={tier} onChange={(event) => setTier(event.target.value)} aria-label="Rango">
            {DUO_GOAL_TIERS.map((option) => (
              <option key={option} value={option}>
                {formatTier(option)}
              </option>
            ))}
          </select>
          {!isApex && (
            <select value={division} onChange={(event) => setDivision(event.target.value)} aria-label="División">
              {RANK_DIVISIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
          <div className="duo-form-actions">
            <button type="submit" className="primary-btn" disabled={isSaving}>
              Guardar
            </button>
            <button type="button" className="secondary-btn" onClick={() => setIsEditing(false)}>
              Cancelar
            </button>
            {goal && (
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  onRemove()
                  setIsEditing(false)
                }}
              >
                Quitar objetivo
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  )
}
