import { describe, expect, it } from 'vitest'
import { formatGoalCurrent, formatGoalGap, formatGoalTitle, openGoalsCountLabel, sortGoals } from './goalLabels'
import type { GoalItem } from '../types/dashboard'

function goal(overrides: Partial<GoalItem>): GoalItem {
  return { id: 'g', accountId: 'acc-1', type: 'rango', progress: 0, status: 'in_progress', ...overrides }
}

describe('formatGoalTitle', () => {
  it('names the queue and target rank for a rank goal', () => {
    expect(formatGoalTitle(goal({ queueType: 'flex', targetTier: 'PLATINUM', targetDivision: 'II' }))).toBe(
      'Flex: llegar a PLATINUM II',
    )
  })

  it('shows winrate and KDA targets for a champion goal', () => {
    expect(
      formatGoalTitle(goal({ type: 'campeon', targetChampion: 'Ahri', targetWinrate: 0.55, targetKda: 3 })),
    ).toBe('Ahri: 55% WR / 3.0 KDA')
  })
})

describe('formatGoalGap', () => {
  it('shows a placeholder, not a check mark, when an open goal has no gap yet', () => {
    expect(formatGoalGap(goal({ gap: null, gapLabel: 'LP' }))).toEqual({ value: '—', label: 'LP' })
    expect(formatGoalGap(goal({ status: 'completed' }))).toEqual({ value: '✓', label: 'CUMPLIDO' })
  })
})

describe('formatGoalCurrent', () => {
  it('describes an unranked account instead of printing "Unranked"', () => {
    expect(formatGoalCurrent(goal({ current: { tier: 'Unranked' } }))).toBe('Actual: sin clasificar')
  })
})

describe('sortGoals', () => {
  it('lists open goals first, each group by progress', () => {
    const sorted = sortGoals([
      goal({ id: 'done', status: 'completed', progress: 1 }),
      goal({ id: 'low', progress: 0.2 }),
      goal({ id: 'high', progress: 0.8 }),
    ])

    expect(sorted.map((item) => item.id)).toEqual(['high', 'low', 'done'])
  })
})

describe('openGoalsCountLabel', () => {
  it('words zero, one and many', () => {
    expect(openGoalsCountLabel(0)).toBe('Sin objetivos abiertos')
    expect(openGoalsCountLabel(1)).toBe('Un objetivo abierto')
    expect(openGoalsCountLabel(4)).toBe('4 abiertos')
  })
})
