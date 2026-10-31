import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { daysUntil } from './dates'

describe('daysUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-30T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('rounds partial days up', () => {
    expect(daysUntil('2026-11-01T00:00:00Z')).toBe(2)
  })

  it('is null without a deadline or once it has passed', () => {
    expect(daysUntil(null)).toBeNull()
    expect(daysUntil('2026-10-29T00:00:00Z')).toBeNull()
  })
})
