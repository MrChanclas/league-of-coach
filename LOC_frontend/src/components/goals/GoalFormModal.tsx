import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import type { GoalCreateInput, GoalType } from '../../types/dashboard'
import { ROLE_LABELS } from '../../lib/goalLabels'
import { RANK_DIVISIONS, RANK_TIERS, ROLE_KEYS } from '../../lib/constants'
import { getChampionList, getDdragonVersion } from '../../lib/riotAssets'
import { RoleMetricsInfoModal } from './RoleMetricsInfoModal'

type GoalFormModalProps = {
  isOpen: boolean
  accountId: string
  status: string
  onClose: () => void
  onSubmit: (input: GoalCreateInput) => Promise<boolean>
}

const TYPE_TABS: { key: GoalType; label: string }[] = [
  { key: 'rango', label: 'Rango' },
  { key: 'rol', label: 'Rol' },
  { key: 'campeon', label: 'Campeón' },
]

export function GoalFormModal({ isOpen, accountId, status, onClose, onSubmit }: GoalFormModalProps) {
  const [type, setType] = useState<GoalType>('rango')
  const [queueType, setQueueType] = useState<'solo' | 'flex'>('solo')
  const [targetTier, setTargetTier] = useState('GOLD')
  const [targetDivision, setTargetDivision] = useState('IV')
  const [targetRole, setTargetRole] = useState('JUNGLE')
  const [targetChampion, setTargetChampion] = useState('')
  const [targetWinrate, setTargetWinrate] = useState('60')
  const [targetKda, setTargetKda] = useState('')
  const [deadline, setDeadline] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [championList, setChampionList] = useState<string[]>([])
  const [isRoleInfoOpen, setIsRoleInfoOpen] = useState(false)

  useEffect(() => {
    if (!isOpen || championList.length > 0) return
    let cancelled = false
    void getDdragonVersion()
      .then((version) => getChampionList(version))
      .then((list) => {
        if (!cancelled) setChampionList(list)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, championList.length])

  if (!isOpen) return null

  const resetForm = () => {
    setType('rango')
    setQueueType('solo')
    setTargetTier('GOLD')
    setTargetDivision('IV')
    setTargetRole('JUNGLE')
    setTargetChampion('')
    setTargetWinrate('60')
    setTargetKda('')
    setDeadline('')
  }

  const isApexTier = targetTier === 'MASTER' || targetTier === 'GRANDMASTER' || targetTier === 'CHALLENGER'

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()

    const base = { accountId, deadline: deadline || undefined }
    let input: GoalCreateInput

    if (type === 'rango') {
      input = { type, ...base, queueType, targetTier, targetDivision: isApexTier ? undefined : targetDivision }
    } else if (type === 'rol') {
      input = { type, ...base, targetRole }
    } else {
      if (!targetChampion.trim()) return
      input = {
        type,
        ...base,
        targetChampion: targetChampion.trim(),
        targetWinrate: Number(targetWinrate) / 100,
        targetKda: targetKda ? Number(targetKda) : undefined,
      }
    }

    setIsSubmitting(true)
    const success = await onSubmit(input)
    setIsSubmitting(false)
    if (success) {
      resetForm()
      onClose()
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Nuevo objetivo</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="time-toggle" style={{ marginBottom: 16 }}>
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={type === tab.key ? 'time-toggle-btn active' : 'time-toggle-btn'}
              onClick={() => setType(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {type === 'rango' && (
            <>
              <label>
                Cola
                <select value={queueType} onChange={(event) => setQueueType(event.target.value as 'solo' | 'flex')}>
                  <option value="solo">Solo/Dúo</option>
                  <option value="flex">Flexible</option>
                </select>
              </label>
              <label>
                Tier objetivo
                <select value={targetTier} onChange={(event) => setTargetTier(event.target.value)}>
                  {RANK_TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </label>
              {!isApexTier && (
                <label>
                  División objetivo
                  <select value={targetDivision} onChange={(event) => setTargetDivision(event.target.value)}>
                    {RANK_DIVISIONS.map((division) => (
                      <option key={division} value={division}>
                        {division}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}

          {type === 'rol' && (
            <>
              <label>
                Rol
                <select value={targetRole} onChange={(event) => setTargetRole(event.target.value)}>
                  {ROLE_KEYS.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </label>
              <p className="form-hint">
                El objetivo se mide con las métricas propias de este rol, comparadas contra el promedio de tu Elo
                actual — no un winrate fijo.
              </p>
              <button type="button" className="link-btn" onClick={() => setIsRoleInfoOpen(true)}>
                ¿Qué datos miden por rol?
              </button>
            </>
          )}

          {type === 'campeon' && (
            <>
              <label>
                Campeón
                <select
                  value={targetChampion}
                  onChange={(event) => setTargetChampion(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    {championList.length === 0 ? 'Cargando campeones...' : 'Selecciona un campeón'}
                  </option>
                  {championList.map((champion) => (
                    <option key={champion} value={champion}>
                      {champion}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Winrate objetivo (%)
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={targetWinrate}
                  onChange={(event) => setTargetWinrate(event.target.value)}
                  required
                />
              </label>
              <label>
                KDA objetivo (opcional)
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={targetKda}
                  onChange={(event) => setTargetKda(event.target.value)}
                  placeholder="Ej: 4.0"
                />
              </label>
            </>
          )}

          <label>
            Fecha límite (opcional)
            <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
          </label>

          <button type="submit" className="primary-btn auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear objetivo'}
          </button>
        </form>

        {status && <p className="auth-status">{status}</p>}
      </div>

      <RoleMetricsInfoModal isOpen={isRoleInfoOpen} onClose={() => setIsRoleInfoOpen(false)} />
    </div>
  )
}
