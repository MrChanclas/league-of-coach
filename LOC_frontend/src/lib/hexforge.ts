import { APEX_TIERS, LANE_LABELS, RANK_DIVISIONS, RANK_TIERS, TIER_COLORS } from '../constants'
import type { NextRank } from '../types/dashboard'

export function getTierColor(tier: string): string | null {
  return TIER_COLORS[tier.trim().toUpperCase()] ?? null
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)

  if (minutes < 1) return 'ahora mismo'
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  return `hace ${days} d`
}

export function formatLastSyncedLabel(lastSyncedAt: Date | null): string {
  if (!lastSyncedAt) return 'Sin sincronizar en esta sesión'
  const minutes = Math.max(0, Math.round((Date.now() - lastSyncedAt.getTime()) / 60_000))
  if (minutes < 1) return 'Sincronizado hace instantes'
  return `Sincronizado hace ${minutes} min`
}

export function formatGameDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

export function getNextRank(tier: string, division: string): NextRank | null {
  const normalizedTier = tier.trim().toUpperCase()
  const normalizedDivision = division.trim().toUpperCase()
  const tierIndex = RANK_TIERS.indexOf(normalizedTier as (typeof RANK_TIERS)[number])
  if (tierIndex === -1) return null

  if (APEX_TIERS.has(normalizedTier)) {
    const nextTier = RANK_TIERS[tierIndex + 1]
    return nextTier ? { tier: nextTier, division: 'I' } : null
  }

  const divisionIndex = RANK_DIVISIONS.indexOf(normalizedDivision as (typeof RANK_DIVISIONS)[number])
  if (divisionIndex !== -1 && divisionIndex < RANK_DIVISIONS.length - 1) {
    return { tier: normalizedTier, division: RANK_DIVISIONS[divisionIndex + 1] }
  }

  const nextTier = RANK_TIERS[tierIndex + 1]
  if (!nextTier) return null
  return { tier: nextTier, division: APEX_TIERS.has(nextTier) ? 'I' : 'IV' }
}

export function getLaneLabel(lane: string): string {
  return LANE_LABELS[lane.trim().toUpperCase()] ?? '—'
}
