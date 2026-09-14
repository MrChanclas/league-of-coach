import { useMemo, useState } from 'react'
import { getChampionIconUrl } from '../../lib/riotAssets'
import {
  FILL_SLOT,
  MAX_CHAMPIONS_PER_ROLE,
  MIN_CHAMPIONS_PER_ROLE,
  POOL_ROLE_KEYS,
  POOL_ROLE_LABELS,
  POOL_SLOT_LABELS,
  getPoolSlotCaption,
  getPoolSlots,
  resolvePoolSlot,
} from '../../lib/poolLabels'
import type {
  PoolEntry,
  PoolRecommendation,
  PoolRoleKey,
  PoolRoleProfile,
  PoolSlotKey,
  ReplacePoolEntryInput,
  RosterChampion,
} from '../../types/dashboard'

type SlotValue = {
  championKey: string
  state: 'main' | 'secondary' | 'testing'
  note?: string
  addedBy: 'player' | 'coach'
}
type SlotMap = Record<PoolSlotKey, SlotValue[]>
type RoleStatus = 'empty' | 'incomplete' | 'valid'

type SuggestedChampion = {
  champion: RosterChampion
  ribbon: 'CUBRE HUECO' | 'TU ESTILO' | 'LECCIÓN ABIERTA' | null
}

type PoolSelectorProps = {
  roster: RosterChampion[]
  ddragonVersion: string | null
  initialEntries: PoolEntry[]
  roleProfile: PoolRoleProfile
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
  return { TOP: [], JUNGLE: [], MIDDLE: [], BOTTOM: [], UTILITY: [], FILL: [] }
}

function buildInitialSlots(entries: PoolEntry[], roleProfile: PoolRoleProfile): SlotMap {
  const slots = emptySlotMap()
  for (const entry of [...entries].sort((a, b) => a.position - b.position)) {
    slots[resolvePoolSlot(entry.role, roleProfile)].push({
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

function pickInitialActiveRole(slots: SlotMap, slotKeys: PoolSlotKey[]): PoolSlotKey {
  return slotKeys.find((role) => slots[role].length === 0) ?? slotKeys[0]
}

export function PoolSelector({
  roster,
  ddragonVersion,
  initialEntries,
  roleProfile,
  playedChampionKeys,
  championsWithOpenLesson,
  recommendation,
  isRecommendationLoading,
  isSaving,
  onSave,
  onCancel,
}: PoolSelectorProps) {
  const slotKeys = useMemo(() => getPoolSlots(roleProfile), [roleProfile])
  const [slots, setSlots] = useState<SlotMap>(() => buildInitialSlots(initialEntries, roleProfile))
  const [activeRole, setActiveRole] = useState<PoolSlotKey>(() =>
    pickInitialActiveRole(buildInitialSlots(initialEntries, roleProfile), getPoolSlots(roleProfile)),
  )
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | PoolRoleKey>('ALL')
  const [onlyPlayed, setOnlyPlayed] = useState(false)
  const [coachMessage, setCoachMessage] = useState<string | null>(null)
  const [roleLimitMessage, setRoleLimitMessage] = useState<string | null>(null)

  const rosterByKey = useMemo(() => new Map(roster.map((champion) => [champion.championKey, champion])), [roster])
  const assignedKeys = useMemo(
    () => new Set(slotKeys.flatMap((role) => slots[role].map((slot) => slot.championKey))),
    [slots, slotKeys],
  )

  function assignChampion(championKey: string, targetRole?: PoolSlotKey) {
    const role = targetRole ?? activeRole
    if (slots[role].some((slot) => slot.championKey === championKey)) return
    if (slots[role].length >= MAX_CHAMPIONS_PER_ROLE) {
      setRoleLimitMessage(`${POOL_SLOT_LABELS[role]} ya tiene el máximo de ${MAX_CHAMPIONS_PER_ROLE} campeones.`)
      return
    }

    const next: SlotMap = emptySlotMap()
    for (const key of slotKeys) {
      next[key] = slots[key].filter((slot) => slot.championKey !== championKey)
    }
    next[role] = [...next[role], { championKey, state: 'testing', addedBy: 'player' }]
    setSlots(next)
    setRoleLimitMessage(null)

    if (!targetRole && next[role].length >= MAX_CHAMPIONS_PER_ROLE) {
      const nextRole = slotKeys.find((candidate) => next[candidate].length < MAX_CHAMPIONS_PER_ROLE)
      if (nextRole) setActiveRole(nextRole)
    }
  }

  function removeChampion(role: PoolSlotKey, championKey: string) {
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
      const slot = resolvePoolSlot(entry.role, roleProfile)
      next[slot] = [...next[slot], { championKey: entry.championKey, state: entry.state, addedBy: 'coach', note: entry.reason }]
    }
    setSlots(next)
    setCoachMessage(
      `Precargamos una base para tus líneas main. Todavía necesitas llegar a ${MIN_CHAMPIONS_PER_ROLE} campeones en cada línea que quieras dejar activa.`,
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

  const filledCount = assignedKeys.size
  const hasIncompleteRole = slotKeys.some((role) => roleStatus(slots[role].length) === 'incomplete')
  const canSave = filledCount > 0 && !hasIncompleteRole && !isSaving

  async function handleSave() {
    const entries: ReplacePoolEntryInput[] = slotKeys.flatMap((role) =>
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
          <div className="pool-panel-eyebrow">TUS LÍNEAS</div>
          <p className="pool-panel-hint">
            Haz clic en un retrato para sumarlo a la línea activa, o arrástralo a la que quieras. Los campeones que no
            son de tus líneas main van en Fill.
          </p>
          {!roleProfile.primaryRole && (
            <p className="pool-coach-message pool-coach-message--warn">
              Todavía no detectamos tus líneas main. Sincroniza partidas para habilitarlas; mientras tanto puedes armar tu
              Fill.
            </p>
          )}

          <div className="pool-slots-list">
            {slotKeys.map((role) => {
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
                      {role === FILL_SLOT ? 'FILL' : POOL_SLOT_LABELS[role].slice(0, 3).toUpperCase()}
                    </span>
                    <span className="pool-role-bucket-name">{POOL_SLOT_LABELS[role]}</span>
                    <span className={`pool-role-count pool-role-count--${status}`}>
                      {count}/{MAX_CHAMPIONS_PER_ROLE}
                    </span>
                  </div>

                  <p className="pool-role-bucket-hint">
                    {getPoolSlotCaption(role, roleProfile)}
                    {count === 0 && (isActive ? ' · activa, elige de la grilla' : ' · sin campeones todavía')}
                  </p>
                  {status === 'incomplete' && (
                    <p className="pool-role-bucket-hint pool-role-bucket-hint--warn">
                      Faltan {MIN_CHAMPIONS_PER_ROLE - count} para que esta línea sea válida.
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
            Cada línea necesita entre {MIN_CHAMPIONS_PER_ROLE} y {MAX_CHAMPIONS_PER_ROLE} campeones para ser válida. Puedes
            dejar líneas sin tocar — quedan abiertas hasta que quieras completarlas.
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
              <div className="pool-grid-section-title">SUGERIDOS PARA TI</div>
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
