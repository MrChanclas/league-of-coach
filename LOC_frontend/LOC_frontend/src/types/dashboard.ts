export type TabKey = 'cuentas' | 'aprendizaje' | 'objetivos' | 'partidas'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: string
}

export type AccountCard = {
  id: string
  userId: string
  summoner: string
  tag: string
  server: string
  profileIconId: number
  summonerLevel: number
  soloTier: string
  soloDivision: string
  soloLp: number
  flexTier: string
  flexDivision: string
  flexLp: number
}

export type ChampionStat = {
  champion: string
  role: string
  games: number
  wins: number
  kdaK: number
  kdaD: number
  kdaA: number
  csMin: number
}

export type GoalType = 'rank' | 'consistency' | 'mechanic' | 'habit'
export type GoalStatus = 'completed' | 'in_progress' | 'behind'

export type GoalItem = {
  id: string
  accountId: string
  type: GoalType
  title: string
  progress: number
  deadline?: string | null
  status: GoalStatus
}

export type DashboardSummary = {
  totalAccounts: number
  totalGoals: number
  totalLearnings: number
  activeFocus: string
}

export type DashboardPayload = {
  user: AuthUser
  accounts: AccountCard[]
  goals: GoalItem[]
  learnings: ChampionStat[]
  summary: DashboardSummary
}

export type AccountForm = {
  summoner: string
  tag: string
  server: string
}

export type MatchParticipantEntry = {
  id: string
  matchId: string
  accountId: string | null
  champion: string
  championId: number
  teamPosition: string
  win: boolean
  kills: number
  deaths: number
  assists: number
  csTotal: number
  goldEarned: number
  visionScore: number
  damageDealt: number
  itemIds: number[]
  damagePercentile: number
  lpDelta: number | null
  teamId: number
  match: {
    id: string
    matchId: string
    gameCreation: string
    gameDuration: number
    gameMode: string
    queueId: number
  }
}

export type MasteryEntry = {
  championId: number
  championName: string
  championLevel: number
  championPoints: number
  lastPlayTime: string
}

export type AccountStatsSummary = {
  gamesPlayed: number
  wins: number
  winrate: number
  avgKills: number
  avgDeaths: number
  avgAssists: number
  avgKda: number
  avgCsPerMin: number
}

export type ChampionSplitStat = AccountStatsSummary & {
  champion: string
}

export type RankSnapshotEntry = {
  id: string
  queueType: 'solo' | 'flex'
  tier: string
  division: string
  lp: number
  capturedAt: string
}

export type ActivityDay = {
  date: string
  wins: number
  losses: number
  minutesPlayed: number
}

export type StreakInfo = {
  type: 'win' | 'loss' | 'none'
  count: number
}

export type LaneEntry = {
  lane: string
  games: number
  share: number
}

export type LessonCard = {
  tag: string
  title: string
  body: string
  mediaType: 'CLIP' | 'HEATMAP' | 'GOLD_GRAPH' | 'MATCHUP_TABLE' | 'SESSION_REPORT'
  meta: string
}

export type TimeRange = '7d' | 'split'
