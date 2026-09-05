export const TIER_COLORS: Record<string, string> = {
  IRON: '#8a8578',
  BRONZE: '#a9784f',
  SILVER: '#9fb4bd',
  GOLD: '#cfa64c',
  PLATINUM: '#5fb6d8',
  EMERALD: '#4fd6b0',
  DIAMOND: '#7fa9f0',
  MASTER: '#b980e0',
  GRANDMASTER: '#e05a5a',
  CHALLENGER: '#f4e6a1',
}

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

export function formatGameDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

const TIER_ORDER = [
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
]
const APEX_TIERS = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER'])
const DIVISION_ORDER = ['IV', 'III', 'II', 'I']

export function getNextRank(tier: string, division: string): { tier: string; division: string } | null {
  const normalizedTier = tier.trim().toUpperCase()
  const normalizedDivision = division.trim().toUpperCase()
  const tierIndex = TIER_ORDER.indexOf(normalizedTier)
  if (tierIndex === -1) return null

  if (APEX_TIERS.has(normalizedTier)) {
    const nextTier = TIER_ORDER[tierIndex + 1]
    return nextTier ? { tier: nextTier, division: 'I' } : null
  }

  const divisionIndex = DIVISION_ORDER.indexOf(normalizedDivision)
  if (divisionIndex !== -1 && divisionIndex < DIVISION_ORDER.length - 1) {
    return { tier: normalizedTier, division: DIVISION_ORDER[divisionIndex + 1] }
  }

  const nextTier = TIER_ORDER[tierIndex + 1]
  if (!nextTier) return null
  return { tier: nextTier, division: APEX_TIERS.has(nextTier) ? 'I' : 'IV' }
}

const LANE_LABELS: Record<string, string> = {
  TOP: 'TOP',
  JUNGLE: 'JNG',
  MIDDLE: 'MID',
  BOTTOM: 'ADC',
  UTILITY: 'SUP',
}

export function getLaneLabel(lane: string): string {
  return LANE_LABELS[lane.trim().toUpperCase()] ?? '—'
}
