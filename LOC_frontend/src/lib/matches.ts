import { MATCH_QUEUE_LABELS } from '../constants'
import type { MatchParticipantEntry } from '../types/dashboard'
import type { QueueFilter } from '../types/components'

export function matchesQueueFilter(entry: MatchParticipantEntry, filter: QueueFilter) {
  if (filter === 'all') return true
  return entry.match.queueId === filter
}

export function getQueueLabel(queueId: number) {
  return MATCH_QUEUE_LABELS[queueId] ?? 'PARTIDA'
}
