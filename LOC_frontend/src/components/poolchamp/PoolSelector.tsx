import { useMemo, useState } from 'react'
import { getChampionIconUrl } from '../../lib/riotAssets'
import { MAX_CHAMPIONS_PER_ROLE, MIN_CHAMPIONS_PER_ROLE, POOL_ROLE_KEYS, POOL_ROLE_LABELS } from '../../lib/poolLabels'
import type {
  PoolEntry,
  PoolRecommendation,
  PoolRoleKey,
  ReplacePoolEntryInput,
  RosterChampion,
} from '../../types/dashboard'

type SlotValue = {
  championKey: string
  state: 'main' | 'secondary' | 'testing'
  note?: string
  addedBy: 'player' | 'coach'
}
type SlotMap = Record<PoolRoleKey, SlotValue[]>
type RoleStatus = 'empty' | 'incomplete' | 'valid'

type SuggestedChampion = {
  champion: RosterChampion
  ribbon: 'CUBRE HUECO' | 'TU ESTILO' | 'LECCIÓN ABIERTA' | null
}

type PoolSelectorProps = {
  roster: RosterChampion[]
  ddragonVersion: string | null
  initialEntries: PoolEntry[]
  playedChampionKeys: Set<string>
  championsWithOpenLesson: Set<string>
  recommendation: PoolRecommendation | undefined
  isRecommendationLoading: boolean
  isSaving: boolean
  onSave: (entries: ReplacePoolEntryInput[]) => Promise<boolean>
  onCancel: () => void
}

const ROLE_FILTERS: ('ALL' | PoolRoleKey)[] = ['ALL', ...POOL_ROLE_KEYS]
const SUGGESTED_LIMIT = 8

function emptySlotMap(): SlotMap {
  return { TOP: [], JUNGLE: [], MIDDLE: [], BOTTOM: [], UTILITY: [] }
}

function buildInitialSlots(entries: PoolEntry[]): SlotMap {
  const slots = emptySlotMap()
  for (const entry of [...entries].sort((a, b) => a.position - b.position)) {
    slots[entry.role].push({
      championKey: entry.championKey,
      state: entry.state,
      note: entry.note ?? undefined,
      addedBy: entry.addedBy,
    })
  }
  return slots
}

function roleStatus(count: number): RoleStatus {
  if (count === 0) return 'empty'
  if (count < MIN_CHAMPIONS_PER_ROLE) return 'incomplete'
  return 'valid'
}

function pickInitialActiveRole(slots: SlotMap): PoolRoleKey {
  return POOL_ROLE_KEYS.find((role) => slots[role].length === 0) ?? POOL_ROLE_KEYS[0]
}

export function PoolSelector({
  roster,
  ddragonVersion,
  initialEntries,
  playedChampionKeys,
  championsWithOpenLesson,
  recommendation,
  isRecommendationLoading,
  isSaving,
  onSave,
  onCancel,
}: PoolSelectorProps) {
  const [slots, setSlots] = useState<SlotMap>(() => buildInitialSlots(initialEntries))
  const [activeRole, setActiveRole] = useState<PoolRoleKey>(() => pickInitialActiveRole(buildInitialSlots(initialEntries)))
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | PoolRoleKey>('ALL')
  const [onlyPlayed, setOnlyPlayed] = useState(false)
  const [coachMessage, setCoachMessage] = useState<string | null>(null)
  const [roleLimitMessage, setRoleLimitMessage] = useState<string | null>(null)

  const rosterByKey = useMemo(() => new Map(roster.map((champion) => [champion.championKey, champion])), [roster])
  const assignedKeys = useMemo(
    () => new Set(POOL_ROLE_KEYS.flatMap((role) => slots[role].map((slot) => slot.championKey))),
    [slots],
  )

  function assignChampion(championKey: string, targetRole?: PoolRoleKey) {
    const role = targetRole ?? activeRole
    if (slots[role].some((slot) => slot.championKey === championKey)) return
    if (slots[role].length >= MAX_CHAMPIONS_PER_ROLE) {
      setRoleLimitMessage(`${POOL_ROLE_LABELS[role]} ya tiene el máximo de ${MAX_CHAMPIONS_PER_ROLE} campeones.`)
      return
    }

    const next: SlotMap = emptySlotMap()
    for (const key of POOL_ROLE_KEYS) {
      next[key] = slots[key].filter((slot) => slot.championKey !== championKey)
    }
    next[role] = [...next[role], { championKey, state: 'testing', addedBy: 'player' }]
    setSlots(next)
    setRoleLimitMessage(null)

    if (!targetRole && next[role].length >= MAX_CHAMPIONS_PER_ROLE) {
      const nextRole = POOL_ROLE_KEYS.find((candidate) => next[candidate].length < MAX_CHAMPIONS_PER_ROLE)
      if (nextRole) setActiveRole(nextRole)
    }
  }

  function removeChampion(role: PoolRoleKey, championKey: string) {
    setSlots((previous) => ({ ...previous, [role]: previous[role].filter((slot) => slot.championKey !== championKey) }))
  }

  function handleUseCoach() {
    if (!recommendation) return
    if (!recommendation.available) {
      setCoachMessage(recommendation.reason)
      return
    }
    const next = emptySlotMap()
    for (const entry of recommendation.entries) {
      next[entry.role] = [
        ...next[entry.role],
        { championKey: entry.championKey, state: entry.state, addedBy: 'coach', note: entry.reason },
      ]
    }
    setSlots(next)
    setCoachMessage(
      `Precargamos una base por rol. Todavía necesitás llegar a ${MIN_CHAMPIONS_PER_ROLE} campeones en cada rol que quieras dejar activo.`,
    )
  }

  const suggested = useMemo<SuggestedChampion[]>(() => {
    const list: SuggestedChampion[] = []
    const seen = new Set<string>()

    if (recommendation?.available) {
      for (const entry of recommendation.entries) {
        const champion = rosterByKey.get(entry.championKey)
        if (!champion || seen.has(entry.championKey) || assignedKeys.has(entry.championKey)) continue
        const ribbon = entry.label === 'CUBRE_HUECO' ? 'CUBRE HUECO' : entry.label === 'TU_ESTILO' ? 'TU ESTILO' : null
        list.push({ champion, ribbon })
        seen.add(entry.championKey)
      }
    }

    for (const championKey of championsWithOpenLesson) {
      if (list.length >= SUGGESTED_LIMIT || seen.has(championKey) || assignedKeys.has(championKey)) continue
      const champion = rosterByKey.get(championKey)
      if (!champion) continue
      list.push({ champion, ribbon: 'LECCIÓN ABIERTA' })
      seen.add(championKey)
    }

    if (list.length < SUGGESTED_LIMIT) {
      for (const champion of roster) {
        if (list.length >= SUGGESTED_LIMIT) break
        if (seen.has(champion.championKey) || assignedKeys.has(champion.championKey)) continue
        list.push({ champion, ribbon: null })
        seen.add(champion.championKey)
      }
    }

    return list.slice(0, SUGGESTED_LIMIT)
  }, [recommendation, championsWithOpenLesson, roster, rosterByKey, assignedKeys])

  const filteredRoster = useMemo(() => {
    const query = search.trim().toLowerCase()
    return roster
      .filter((champion) => roleFilter === 'ALL' || champion.role === roleFilter)
      .filter((champion) => !onlyPlayed || playedChampionKeys.has(champion.championKey))
      .filter((champion) => !query || champion.name.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [roster, roleFilter, onlyPlayed, playedChampionKeys, search])

  const roleCounts = useMemo(
    () => Object.fromEntries(POOL_ROLE_KEYS.map((role) => [role, slots[role].length])) as Record<PoolRoleKey, number>,
    [slots],
  )
  const filledCount = assignedKeys.size
  const hasIncompleteRole = POOL_ROLE_KEYS.some((role) => roleStatus(roleCounts[role]) === 'incomplete')
  const canSave = filledCount > 0 && !hasIncompleteRole && !isSaving

  async function handleSave() {
    const entries: ReplacePoolEntryInput[] = POOL_ROLE_KEYS.flatMap((role) =>
      slots[role].map((slot) => ({ championKey: slot.championKey, role, state: slot.state, note: slot.note, addedBy: slot.addedBy })),
    )
    await onSave(entries)
  }

  function renderPortrait(championKey: string) {
    return ddragonVersion ? (
      <img src={getChampionIconUrl(championKey, ddragonVersion)} alt="" />
    ) : (
      <div className="avatar-tile avatar-tile--sm">{championKey.slice(0, 2).toUpperCase()}</div>
    )
  }

  return (
    <div className="view-content pool-selector">
      <div className="detail-breadcrumb">
        <button type="button" className="detail-back" onClick={onCancel}>
          ← Pool Champ
        </button>
        <span className="detail-breadcrumb-sep">/</span>
        <span className="detail-breadcrumb-meta">ARMANDO TU POOL</span>
        <div className="detail-breadcrumb-nav pool-selector-header-actions">
          <span className="pool-selector-counter">{filledCount} CAMPEONES</span>
          <button type="button" className="secondary-btn" onClick={handleUseCoach} disabled={isRecommendationLoading}>
            {isRecommendationLoading ? 'Cargando…' : 'Usar la del coach'}
          </button>
          <button type="button" className="primary-btn" onClick={handleSave} disabled={!canSave}>
            {isSaving ? 'Guardando…' : 'Guardar pool'}
          </button>
        </div>
      </div>

      <div className="pool-selector-body">
        <div className="pool-slots-panel">
          <div className="pool-panel-eyebrow">TUS ROLES</div>
          <p className="pool-panel-hint">
            Clickeá un retrato para sumarlo al rol activo, o arrastralo al rol que quieras.
          </p>

          <div className="pool-slots-list">
            {POOL_ROLE_KEYS.map((role) => {
              const entries = slots[role]
              const count = entries.length
              const status = roleStatus(count)
              const isActive = activeRole === role
              return (
                <div
                  key={role}
                  className={`pool-role-bucket pool-role-bucket--${status}${isActive ? ' pool-role-bucket--active' : ''}`}
                  onClick={() => setActiveRole(role)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    const championKey = event.dataTransfer.getData('text/plain')
                    if (championKey) assignChampion(championKey, role)
                  }}
                >
                  <div className="pool-role-bucket-head">
                    <span className={isActive ? 'pool-slot-role pool-slot-role--active' : 'pool-slot-role'}>
                      {POOL_ROLE_LABELS[role].slice(0, 3).toUpperCase()}
                    </span>
                    <span className="pool-role-bucket-name">{POOL_ROLE_LABELS[role]}</span>
                    <span className={`pool-role-count pool-role-count--${status}`}>
                      {count}/{MAX_CHAMPIONS_PER_ROLE}
                    </span>
                  </div>

                  {count === 0 && (
                    <p className="pool-role-bucket-hint">
                      {isActive ? 'Rol activo · elegí de la grilla' : 'Sin campeones todavía'}
                    </p>
                  )}
                  {status === 'incomplete' && (
                    <p className="pool-role-bucket-hint pool-role-bucket-hint--warn">
                      Faltan {MIN_CHAMPIONS_PER_ROLE - count} para que este rol sea válido.
                    </p>
                  )}

                  {count > 0 && (
                    <div className="pool-role-bucket-chips">
                      {entries.map((slot) => (
                        <span key={slot.championKey} className="pool-role-chip">
                          <span className="pool-role-chip-portrait">{renderPortrait(slot.championKey)}</span>
                          <span className="pool-role-chip-name">{rosterByKey.get(slot.championKey)?.name ?? slot.championKey}</span>
                          <span
                            className="pool-role-chip-remove"
                            role="button"
                            tabIndex={0}
                            aria-label="Quitar del pool"
                            onClick={(event) => {
                              event.stopPropagation()
                              removeChampion(role, slot.championKey)
                            }}
                          >
                            ×
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {coachMessage && <p className="pool-coach-message">{coachMessage}</p>}
          {roleLimitMessage && <p className="pool-coach-message pool-coach-message--warn">{roleLimitMessage}</p>}

          <div className="pool-panel-footer">
            Cada rol necesita entre {MIN_CHAMPIONS_PER_ROLE} y {MAX_CHAMPIONS_PER_ROLE} campeones para ser válido. Podés dejar
            roles sin tocar — quedan abiertos hasta que quieras completarlos.
          </div>
        </div>

        <div className="pool-grid-panel">
          <div className="pool-grid-toolbar">
            <input
              className="pool-search-input"
              type="text"
              placeholder="Buscar campeón…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="pool-filter-chips">
            {ROLE_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={roleFilter === filter ? 'pool-chip pool-chip--active' : 'pool-chip'}
                onClick={() => setRoleFilter(filter)}
              >
                {filter === 'ALL' ? 'Todos' : POOL_ROLE_LABELS[filter]}
              </button>
            ))}
            <button
              type="button"
              className={onlyPlayed ? 'pool-chip pool-chip--active' : 'pool-chip'}
              onClick={() => setOnlyPlayed((value) => !value)}
            >
              Ya jugados
            </button>
          </div>

          {suggested.length > 0 && (
            <div className="pool-grid-section">
              <div className="pool-grid-section-title">SUGERIDOS PARA VOS</div>
              <div className="pool-suggested-grid">
                {suggested.map(({ champion, ribbon }) => (
                  <button
                    key={champion.championKey}
                    type="button"
                    className="pool-suggested-card"
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', champion.championKey)}
                    onClick={() => assignChampion(champion.championKey)}
                  >
                    <div className="pool-suggested-art">
                      {renderPortrait(champion.championKey)}
                      {ribbon && (
                        <span
                          className={`pool-ribbon pool-ribbon--${ribbon === 'CUBRE HUECO' ? 'gap' : ribbon === 'TU ESTILO' ? 'style' : 'lesson'}`}
                        >
                          {ribbon}
                        </span>
                      )}
                    </div>
                    <div className="pool-suggested-name">{champion.name}</div>
                    <div className="pool-suggested-role">{POOL_ROLE_LABELS[champion.role]}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pool-grid-section">
            <div className="pool-grid-section-title">TODOS LOS CAMPEONES</div>
            <div className="pool-all-grid">
              {filteredRoster.map((champion) => {
                const isAssigned = assignedKeys.has(champion.championKey)
                return (
                  <button
                    key={champion.championKey}
                    type="button"
                    className={isAssigned ? 'pool-mini-card pool-mini-card--assigned' : 'pool-mini-card'}
                    draggable={!isAssigned}
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', champion.championKey)}
                    onClick={() => !isAssigned && assignChampion(champion.championKey)}
                    disabled={isAssigned}
                  >
                    <div className="pool-mini-art">
                      {renderPortrait(champion.championKey)}
                      {isAssigned && <span className="pool-mini-check">✓</span>}
                    </div>
                    <div className="pool-mini-name">{champion.name}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
