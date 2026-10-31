import { MIN_CHAMPIONS_PER_ROLE } from '../constants'
import type { PoolEntry, PoolRoleProfile, PoolSlotKey } from '../types/dashboard'
import type { RoleStatus, SlotMap } from '../types/components'
import { resolvePoolSlot } from './poolLabels'

export function emptySlotMap(): SlotMap {
  return { TOP: [], JUNGLE: [], MIDDLE: [], BOTTOM: [], UTILITY: [], FILL: [] }
}

export function buildInitialSlots(entries: PoolEntry[], roleProfile: PoolRoleProfile): SlotMap {
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

export function getRoleStatus(count: number): RoleStatus {
  if (count === 0) return 'empty'
  if (count < MIN_CHAMPIONS_PER_ROLE) return 'incomplete'
  return 'valid'
}

export function pickInitialActiveRole(slots: SlotMap, slotKeys: PoolSlotKey[]): PoolSlotKey {
  return slotKeys.find((role) => slots[role].length === 0) ?? slotKeys[0]
}
