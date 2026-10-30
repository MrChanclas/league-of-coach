import { RANK_BAND_LABELS, ROLE_LABELS } from '../constants'
import { formatTier } from './hexforge'
import type { GoalGap, GoalItem, GoalPace } from '../types/dashboard'

function pct(value: number | undefined) {
  return Math.round((value ?? 0) * 100)
}

export function formatGoalTitle(goal: GoalItem): string {
  if (goal.type === 'rango') {
    const queue = goal.queueType === 'flex' ? 'Flex' : 'SoloQ'
    const division = goal.targetDivision ? ` ${goal.targetDivision}` : ''
    return `${queue}: llegar a ${formatTier(goal.targetTier ?? '')}${division}`
  }

  if (goal.type === 'rol') {
    return `${ROLE_LABELS[goal.targetRole ?? ''] ?? goal.targetRole}: rendimiento de rol`
  }

  const kda = goal.targetKda != null ? ` / ${goal.targetKda.toFixed(1)} KDA` : ''
  return `${goal.targetChampion}: ${pct(goal.targetWinrate)}% WR${kda}`
}

export function formatGoalGap(goal: GoalItem): GoalGap {
  if (goal.status === 'completed') {
    return { value: '✓', label: 'CUMPLIDO' }
  }
  // gap ausente (no completado) es un dato faltante, no un objetivo cumplido
  // — mostrarlo como "✓" sería engañoso, así que se deja un placeholder.
  if (goal.gap == null) {
    return { value: '—', label: goal.gapLabel ?? '' }
  }
  return { value: String(goal.gap), label: goal.gapLabel ?? '' }
}

export function formatGoalPace(goal: GoalItem): GoalPace {
  if (goal.status === 'completed') {
    return { action: goal.deadline ? new Date(goal.deadline).toLocaleDateString() : '', context: 'CUMPLIDO' }
  }
  return { action: goal.pace ?? 'Faltan partidas', context: goal.paceSub ?? '' }
}

export function formatGoalCurrent(goal: GoalItem): string {
  const current = goal.current
  if (!current) return ''

  if (goal.type === 'rango') {
    if (!current.tier || current.tier === 'Unranked') return 'Actual: sin clasificar'
    const divisionPart = current.division && current.division !== 'Unranked' ? ` ${current.division}` : ''
    const lpPart = current.lp != null ? ` · ${current.lp} LP` : ''
    return `Actual: ${formatTier(current.tier)}${divisionPart}${lpPart}`
  }

  if (goal.type === 'rol') {
    if (!current.gamesPlayed) return 'Sin partidas registradas en este rol todavía'
    const band = RANK_BAND_LABELS[current.rankBand ?? ''] ?? ''
    return `Actual: ${current.roleScore ?? 0}/100 vs. Elo ${band} (${current.gamesPlayed} partidas)`
  }

  if (!current.gamesPlayed) return 'Sin partidas registradas con este campeón todavía'
  const kda = current.avgKda != null ? ` · ${current.avgKda.toFixed(1)} KDA` : ''
  return `Actual: ${pct(current.winrate)}% WR${kda} (${current.gamesPlayed} partidas)`
}

export function sortGoals(goals: GoalItem[]): GoalItem[] {
  return [...goals].sort((a, b) => {
    const aCompleted = a.status === 'completed' ? 1 : 0
    const bCompleted = b.status === 'completed' ? 1 : 0
    if (aCompleted !== bCompleted) return aCompleted - bCompleted
    return b.progress - a.progress
  })
}

export function openGoalsCountLabel(count: number) {
  if (count === 0) return 'Sin objetivos abiertos'
  if (count === 1) return 'Un objetivo abierto'
  return `${count} abiertos`
}
