export type TabKey = 'cuentas' | 'aprendizaje' | 'objetivos' | 'partidas'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: string
  onboardingCompletedAt: string | null
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

export type GoalType = 'rango' | 'rol' | 'campeon'
export type GoalStatus = 'completed' | 'in_progress' | 'behind'
export type GoalQueue = 'solo' | 'flex'

export type RoleMetric = {
  key: string
  label: string
  unit: 'perMin' | 'pct' | 'count'
  direction: 'higher' | 'lower'
  value: number
  benchmark: number
  scorePct: number
}

export type GoalCurrent = {
  tier?: string
  division?: string
  lp?: number
  winrate?: number
  avgKda?: number
  gamesPlayed?: number
  // type = 'rol'
  roleScore?: number
  rankBand?: 'LOW' | 'MID' | 'HIGH'
  roleMetrics?: RoleMetric[]
}

export type GoalItem = {
  id: string
  accountId: string
  type: GoalType
  progress: number
  deadline?: string | null
  status: GoalStatus
  current?: GoalCurrent
  // type = 'rango'
  queueType?: GoalQueue
  targetTier?: string
  targetDivision?: string | null
  // type = 'rol'
  targetRole?: string
  // type = 'campeon'
  targetWinrate?: number
  // type = 'campeon'
  targetChampion?: string
  targetKda?: number | null
  // derivados (brecha / ritmo), null cuando el objetivo ya está completado
  gap?: number | null
  gapLabel?: string | null
  pace?: string | null
  paceSub?: string | null
}

export type GoalCreateInput =
  | {
      type: 'rango'
      accountId: string
      queueType: GoalQueue
      targetTier: string
      targetDivision?: string
      deadline?: string
    }
  | {
      type: 'rol'
      accountId: string
      targetRole: string
      deadline?: string
    }
  | {
      type: 'campeon'
      accountId: string
      targetChampion: string
      targetWinrate: number
      targetKda?: number
      deadline?: string
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

export type QueueStats = {
  solo: AccountStatsSummary | null
  flex: AccountStatsSummary | null
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

export type GoalGap = { value: string; label: string }
export type GoalPace = { action: string; context: string }
