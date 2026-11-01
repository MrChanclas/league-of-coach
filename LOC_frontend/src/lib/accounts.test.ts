import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildLastSevenDays, formatQueueWinrate, getOrderedQueues, getPrimaryQueueLabel } from './accounts'
import type { AccountCard } from '../types/dashboard'

function account(overrides: Partial<AccountCard> = {}): AccountCard {
  return {
    id: 'acc-1',
    userId: 'user-1',
    summoner: 'Faker',
    tag: 'LAS',
    server: 'LAS',
    profileIconId: 1,
    verifiedAt: null,
    summonerLevel: 300,
    soloTier: 'GOLD',
    soloDivision: 'II',
    soloLp: 40,
    flexTier: 'SILVER',
    flexDivision: 'I',
    flexLp: 10,
    ...overrides,
  }
}

describe('getOrderedQueues', () => {
  it('lists Solo/Dúo first unless it is unranked', () => {
    expect(getOrderedQueues(account()).map((queue) => queue.key)).toEqual(['solo', 'flex'])
    expect(getOrderedQueues(account({ soloTier: 'Unranked' })).map((queue) => queue.key)).toEqual(['flex', 'solo'])
  })
})

describe('formatQueueWinrate', () => {
  it('shows the winrate and games, or just zero games', () => {
    expect(formatQueueWinrate(null)).toBe('0 J')
    expect(
      formatQueueWinrate({
        gamesPlayed: 20,
        wins: 11,
        winrate: 0.55,
        avgKills: 0,
        avgDeaths: 0,
        avgAssists: 0,
        avgKda: 0,
        avgCsPerMin: 0,
      }),
    ).toBe('55% WR · 20 J')
  })
})

describe('getPrimaryQueueLabel', () => {
  it('falls back to Flex when Solo/Dúo is unranked', () => {
    expect(getPrimaryQueueLabel(account({ soloTier: 'Unranked' })).label).toBe('Plata I · 10')
  })

  it('says unranked when neither queue has a rank', () => {
    expect(getPrimaryQueueLabel(account({ soloTier: 'Unranked', flexTier: 'Unranked' }))).toEqual({
      label: 'Sin clasificar',
      color: null,
    })
  })
})

describe('buildLastSevenDays', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('fills the days without games so the chart always has seven bars', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-30T12:00:00Z'))

    const days = buildLastSevenDays([{ date: '2026-10-29', wins: 2, losses: 1, minutesPlayed: 90 }])

    expect(days).toHaveLength(7)
    expect(days[0].date).toBe('2026-10-24')
    expect(days[5]).toEqual({ date: '2026-10-29', wins: 2, losses: 1, minutesPlayed: 90 })
    expect(days[6]).toEqual({ date: '2026-10-30', wins: 0, losses: 0, minutesPlayed: 0 })
  })
})
