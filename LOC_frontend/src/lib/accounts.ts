import type { AccountCard, AccountStatsSummary, ActivityDay, QueueInfo, QueueStats } from '../types/dashboard'
import { formatRank, getTierColor } from './hexforge'

export function getOrderedQueues(account: AccountCard, stats?: QueueStats): QueueInfo[] {
  const solo: QueueInfo = {
    key: 'solo',
    label: 'SOLO/DÚO',
    tier: account.soloTier,
    division: account.soloDivision,
    lp: account.soloLp,
    summary: stats?.solo ?? null,
  }
  const flex: QueueInfo = {
    key: 'flex',
    label: 'FLEXIBLE',
    tier: account.flexTier,
    division: account.flexDivision,
    lp: account.flexLp,
    summary: stats?.flex ?? null,
  }

  return account.soloTier !== 'Unranked' ? [solo, flex] : [flex, solo]
}

export function formatQueueWinrate(summary: AccountStatsSummary | null) {
  if (!summary || summary.gamesPlayed === 0) return '0 J'
  return `${Math.round(summary.winrate * 100)}% WR · ${summary.gamesPlayed} J`
}

export function getPrimaryQueueLabel(account: AccountCard) {
  const isSoloRanked = account.soloTier !== 'Unranked'
  const isFlexRanked = account.flexTier !== 'Unranked'
  if (!isSoloRanked && !isFlexRanked) return { label: 'Sin clasificar', color: null }

  const tier = isSoloRanked ? account.soloTier : account.flexTier
  const division = isSoloRanked ? account.soloDivision : account.flexDivision
  const lp = isSoloRanked ? account.soloLp : account.flexLp
  return { label: `${formatRank(tier, division)} · ${lp}`, color: getTierColor(tier) }
}

export function buildLastSevenDays(activity: ActivityDay[]): ActivityDay[] {
  const byDate = new Map(activity.map((day) => [day.date, day]))
  const days: ActivityDay[] = []

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - offset)
    const key = date.toISOString().slice(0, 10)
    days.push(byDate.get(key) ?? { date: key, wins: 0, losses: 0, minutesPlayed: 0 })
  }

  return days
}
