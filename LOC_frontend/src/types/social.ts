// Shapes returned by the backend's /social routes (see LOC_backend/src/social).

export type DuoQueue = 'solo' | 'flex'
export type AvailabilitySlot = 'manana' | 'tarde' | 'noche' | 'madrugada'

// Another player's public card: Riot identity and rank in the duo's queue.
export type DuoAccountCard = {
  summoner: string
  tag: string
  server: string
  profileIconId: number
  summonerLevel: number
  tier: string
  division: string
  lp: number
}

export type DuoProfile = {
  id: string
  accountId: string
  queue: DuoQueue
  roles: string[]
  lookingFor: string[]
  availability: AvailabilitySlot[]
  note: string | null
  active: boolean
}

export type DuoProfileResponse = {
  profile: DuoProfile | null
  discordUsername: string | null
}

export type DuoProfileInput = {
  accountId: string
  queue: DuoQueue
  roles: string[]
  lookingFor: string[]
  availability: AvailabilitySlot[]
  note?: string
  active: boolean
}

export type RankTarget = { tier: string; division: string | null }

export type DuoCandidate = {
  userId: string
  account: DuoAccountCard
  queue: DuoQueue
  roles: string[]
  lookingFor: string[]
  availability: AvailabilitySlot[]
  note: string | null
  match: {
    score: number
    playsWhatIWant: boolean
    wantsWhatIPlay: boolean
    sharedGoal: RankTarget | null
    sharedAvailability: AvailabilitySlot[]
  }
  pendingRequest: 'sent' | 'received' | null
}

export type DuoCandidatesResponse = {
  profileActive: boolean
  candidates: DuoCandidate[]
}

export type DuoRequestView = {
  id: string
  queue: DuoQueue
  message: string | null
  createdAt: string
  otherUserId: string
  account: DuoAccountCard
}

export type DuoRequestsResponse = {
  received: DuoRequestView[]
  sent: DuoRequestView[]
}

export type DuoListItem = {
  id: string
  queue: DuoQueue
  createdAt: string
  partner: DuoAccountCard
  lastMessage: { body: string; createdAt: string; mine: boolean } | null
  unread: number
}

export type RankGoalProgress = {
  progress: number
  completed: boolean
  lpRemaining: number | null
}

export type DuoRecord = { games: number; wins: number; winrate: number }

export type DuoGame = {
  matchId: string
  playedAt: string
  win: boolean
  me: { champion: string; kda: number }
  partner: { champion: string; kda: number }
}

export type DuoDetail = {
  id: string
  queue: DuoQueue
  createdAt: string
  endedAt: string | null
  me: DuoAccountCard
  partner: DuoAccountCard & { discordUsername: string | null }
  goal: {
    targetTier: string
    targetDivision: string | null
    deadline: string | null
    me: RankGoalProgress
    partner: RankGoalProgress
  } | null
  stats: { allTime: DuoRecord; sinceDuo: DuoRecord; recent: DuoGame[] }
}

export type DuoGoalInput = {
  targetTier: string
  targetDivision?: string
  deadline?: string
}

export type DuoMessage = {
  id: string
  body: string
  createdAt: string
  mine: boolean
}

export type SocialSummary = {
  pendingRequests: number
  unreadMessages: number
}
