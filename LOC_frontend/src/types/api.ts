import type { MatchParticipantEntry, PoolEntryState, PoolSlotKey, ReplacePoolInput } from './dashboard'

export type ApiFetchOptions = {
  method?: string
  token?: string | null
  body?: unknown
  // Disable the JSON parse for successful responses without a body.
  parseJson?: boolean
}

export type ResolveAccountInput = {
  summoner: string
  tag: string
  server: string
  userId: string
}

export type AccountSearchResponse = {
  message?: string
  found?: boolean
  created?: boolean
}

export type AccountVerificationTarget = {
  summoner: string
  tag: string
  server: string
}

export type AccountVerificationChallenge = AccountVerificationTarget & {
  iconId: number
  expiresAt: string
}

export type PlatformStatsResponse = {
  totalAccountsAnalyzed: number
}

export type TwitchLiveStatus =
  | { live: false; channelUrl: string }
  | {
      live: true
      channelUrl: string
      streamId: string
      title: string
      gameName: string
      viewerCount: number
      startedAt: string
    }

export type MatchPageResponse = {
  items: MatchParticipantEntry[]
  /** How many days back the history list reaches (the sync still covers the whole season). */
  windowDays: number
  /** True when the window is empty but the account does have older ranked games stored. */
  hasOlderMatches: boolean
}

export type SavePoolMutationInput = {
  accountId: string
  input: ReplacePoolInput
}

export type PoolEntryMutationInput = {
  accountId: string
  championKey: string
  role: PoolSlotKey
}

export type UpdatePoolEntryMutationInput = PoolEntryMutationInput & {
  patch: {
    state?: PoolEntryState
    note?: string | null
  }
}

export type FeedbackInput = {
  message: string
  email: string
}

export type SyncMatchesResponse = {
  synced?: number
  skipped?: number
  relinked?: number
  // Riot's rate limit can leave season history pending for later sync rounds.
  seasonBackfill?: { done: boolean; oldestSyncedAt: string | null }
}

export type ApiValidationIssue = {
  message?: string
}

export type ApiErrorPayload = {
  message?: string
  code?: string
  errors?: ApiValidationIssue[]
}

export type ChampionIndexResponse = {
  data: Record<string, { name: string }>
}
