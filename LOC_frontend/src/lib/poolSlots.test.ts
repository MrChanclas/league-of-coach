import { describe, expect, it } from 'vitest'
import { MIN_CHAMPIONS_PER_ROLE } from '../constants'
import { getPoolSlots, resolvePoolSlot } from './poolLabels'
import { buildInitialSlots, getRoleStatus, pickInitialActiveRole } from './poolSlots'
import type { PoolEntry, PoolRoleProfile } from '../types/dashboard'

const profile: PoolRoleProfile = { primaryRole: 'MIDDLE', secondaryRole: 'UTILITY' }

function entry(overrides: Partial<PoolEntry>): PoolEntry {
  return {
    championKey: 'Ahri',
    name: 'Ahri',
    role: 'MIDDLE',
    state: 'main',
    note: null,
    addedBy: 'user',
    position: 0,
    gamesPlayed: 0,
    winrate: 0,
    performance: { status: 'insufficient_data' },
    ...overrides,
  } as PoolEntry
}

describe('pool slots', () => {
  it('offers the main lines plus one FILL slot', () => {
    expect(getPoolSlots(profile)).toEqual(['MIDDLE', 'UTILITY', 'FILL'])
    expect(getPoolSlots(undefined)).toEqual(['FILL'])
  })

  it('files any off-line role under FILL', () => {
    expect(resolvePoolSlot('UTILITY', profile)).toBe('UTILITY')
    expect(resolvePoolSlot('TOP', profile)).toBe('FILL')
  })
})

describe('buildInitialSlots', () => {
  it('groups saved entries by slot in their saved order', () => {
    const slots = buildInitialSlots(
      [
        entry({ championKey: 'Syndra', position: 1 }),
        entry({ championKey: 'Ahri', position: 0 }),
        entry({ championKey: 'Garen', role: 'TOP', position: 2 }),
      ],
      profile,
    )

    expect(slots.MIDDLE.map((slot) => slot.championKey)).toEqual(['Ahri', 'Syndra'])
    expect(slots.FILL.map((slot) => slot.championKey)).toEqual(['Garen'])
    expect(slots.UTILITY).toEqual([])
  })

  it('opens the selector on the first slot that still needs champions', () => {
    const slots = buildInitialSlots([entry({ championKey: 'Ahri' })], profile)

    expect(pickInitialActiveRole(slots, getPoolSlots(profile))).toBe('UTILITY')
  })
})

describe('getRoleStatus', () => {
  it('is valid only from the minimum champions per role', () => {
    expect(getRoleStatus(0)).toBe('empty')
    expect(getRoleStatus(MIN_CHAMPIONS_PER_ROLE - 1)).toBe('incomplete')
    expect(getRoleStatus(MIN_CHAMPIONS_PER_ROLE)).toBe('valid')
  })
})
