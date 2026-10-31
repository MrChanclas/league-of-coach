import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  formatGameDuration,
  formatLastSyncedLabel,
  formatRelativeTime,
  getLaneLabel,
  getNextRank,
  getTierColor,
} from './hexforge'

describe('getNextRank', () => {
  it('climbs a division inside the same tier', () => {
    expect(getNextRank('gold', 'iv')).toEqual({ tier: 'GOLD', division: 'III' })
  })

  it('moves to the next tier after division I', () => {
    expect(getNextRank('GOLD', 'I')).toEqual({ tier: 'PLATINUM', division: 'IV' })
  })

  it('goes from Diamond I straight to Master, which has no divisions', () => {
    expect(getNextRank('DIAMOND', 'I')).toEqual({ tier: 'MASTER', division: 'I' })
    expect(getNextRank('MASTER', 'I')).toEqual({ tier: 'GRANDMASTER', division: 'I' })
  })

  it('has nothing above Challenger or for an unknown tier', () => {
    expect(getNextRank('CHALLENGER', 'I')).toBeNull()
    expect(getNextRank('Unranked', '')).toBeNull()
  })
})

describe('formatGameDuration', () => {
  it('pads seconds to two digits', () => {
    expect(formatGameDuration(25 * 60 + 7)).toBe('25:07')
  })
})

describe('time labels', () => {
  const now = new Date('2026-10-30T12:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('describes how long ago a game was played', () => {
    const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString()

    expect(formatRelativeTime(minutesAgo(0))).toBe('ahora mismo')
    expect(formatRelativeTime(minutesAgo(45))).toBe('hace 45 min')
    expect(formatRelativeTime(minutesAgo(5 * 60))).toBe('hace 5 h')
    expect(formatRelativeTime(minutesAgo(24 * 60))).toBe('ayer')
    expect(formatRelativeTime(minutesAgo(3 * 24 * 60))).toBe('hace 3 d')
  })

  it('describes the last sync of the session', () => {
    expect(formatLastSyncedLabel(null)).toBe('Sin sincronizar en esta sesión')
    expect(formatLastSyncedLabel(new Date(now.getTime() - 10_000))).toBe('Sincronizado hace instantes')
    expect(formatLastSyncedLabel(new Date(now.getTime() - 12 * 60_000))).toBe('Sincronizado hace 12 min')
  })
})

describe('tier and lane lookups', () => {
  it('ignores case and surrounding spaces, and falls back for unknown values', () => {
    expect(getTierColor(' gold ')).toBe(getTierColor('GOLD'))
    expect(getTierColor('Unranked')).toBeNull()
    expect(getLaneLabel('utility')).toBe('SUP')
    expect(getLaneLabel('')).toBe('—')
  })
})
