import { AVAILABILITY_LABELS, ROLE_LABELS } from '../constants'
import type { AvailabilitySlot, DuoCandidate, DuoMessage, RankTarget } from '../types/social'
import { formatRank } from './hexforge'

/** Appends newly polled messages, dropping ones already in the list. */
export function mergeMessages(current: DuoMessage[], incoming: DuoMessage[]): DuoMessage[] {
  if (incoming.length === 0) return current
  const known = new Set(current.map((message) => message.id))
  const added = incoming.filter((message) => !known.has(message.id))
  return added.length === 0 ? current : [...current, ...added]
}

export function formatRoles(roles: string[]): string {
  return roles.map((role) => ROLE_LABELS[role] ?? role).join(' / ')
}

export function formatAvailability(slots: AvailabilitySlot[]): string {
  return slots.map((slot) => AVAILABILITY_LABELS[slot]).join(', ')
}

export function formatRankTarget(target: RankTarget): string {
  return formatRank(target.tier, target.division ?? '')
}

/** Why a candidate shows up near the top, as short Spanish phrases. */
export function describeMatch(candidate: DuoCandidate): string[] {
  const reasons: string[] = []
  const { match } = candidate
  if (match.playsWhatIWant) reasons.push('Juega la línea que buscas')
  if (match.wantsWhatIPlay) reasons.push('Busca tu línea')
  if (match.sharedGoal) reasons.push(`Mismo objetivo: ${formatRankTarget(match.sharedGoal)}`)
  if (match.sharedAvailability.length > 0) {
    reasons.push(`Horario en común: ${formatAvailability(match.sharedAvailability)}`)
  }
  return reasons
}

export function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}
