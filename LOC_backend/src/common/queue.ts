// Riot's two ranked queues — the only ones this app ever syncs, tracks rank
// snapshots for, or lets a "rango" goal target. Centralized here because the
// numeric ids (420/440), Riot's string queue-type names, and this app's own
// 'solo' | 'flex' key were previously each hand-copied across matches,
// rank-snapshots, and goals independently.
export const QUEUE_IDS = {
  SOLO: 420,
  FLEX: 440,
} as const;

export const RANKED_QUEUE_IDS = [QUEUE_IDS.SOLO, QUEUE_IDS.FLEX] as const;

export type QueueKey = 'solo' | 'flex';

export const QUEUE_KEY_BY_ID: Record<number, QueueKey> = {
  [QUEUE_IDS.SOLO]: 'solo',
  [QUEUE_IDS.FLEX]: 'flex',
};

/** Riot's league-v4 queue-type name for each of this app's queue keys. */
export const RIOT_QUEUE_TYPE_BY_KEY: Record<QueueKey, string> = {
  solo: 'RANKED_SOLO_5x5',
  flex: 'RANKED_FLEX_SR',
};

/** The inverse of RIOT_QUEUE_TYPE_BY_KEY, for parsing Riot's league entries. */
export const QUEUE_KEY_BY_RIOT_QUEUE_TYPE: Record<string, QueueKey> = {
  RANKED_SOLO_5x5: 'solo',
  RANKED_FLEX_SR: 'flex',
};
