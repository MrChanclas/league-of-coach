import type { BehaviorFlag, GoalPrefill, PoolView, RosterChampion } from '../types/dashboard'

// Un salto realista sobre el winrate actual: ni tan chico que no sea meta,
// ni tan alto que arranque destinado a fallar.
export function suggestChampionWinrateTarget(currentWinrate: number): number {
  const currentPct = Math.round(currentWinrate * 100)
  return Math.max(55, Math.min(70, currentPct + 10))
}

/**
 * Traduce un error detectado (BehaviorFlag) a un pre-llenado para
 * GoalFormModal. `flag.champion` es la misma championKey cruda que ya usan
 * `poolView.entries`/`poolView.outsiders`, así que no hace falta normalizar
 * nombres para buscar el winrate actual.
 */
export function buildGoalPrefillFromFlag(
  flag: BehaviorFlag,
  poolView: PoolView | undefined,
  roster: RosterChampion[],
): GoalPrefill {
  if (flag.type === 'ROLE_WEAKNESS') {
    return { type: 'rol', targetRole: flag.role }
  }

  const championKey = flag.champion ?? ''
  const displayName = roster.find((champion) => champion.championKey === championKey)?.name ?? championKey
  const currentWinrate =
    poolView?.entries.find((entry) => entry.championKey === championKey)?.winrate ??
    poolView?.outsiders.find((outsider) => outsider.championKey === championKey)?.winrate

  return {
    type: 'campeon',
    targetChampion: displayName,
    targetWinratePct: currentWinrate != null ? suggestChampionWinrateTarget(currentWinrate) : undefined,
  }
}
