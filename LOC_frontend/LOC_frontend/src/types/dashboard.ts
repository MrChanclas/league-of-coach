export type TabKey = 'cuentas' | 'aprendizaje' | 'objetivos' | 'cuenta' | 'partidas'

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

export type GoalItem = {
  id: string
  accountId: string
  type: 'rank' | 'role' | 'champion'
  title: string
  progress: number
  deadline?: string | null
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
  accountId: string
  champion: string
  championId: number
  teamPosition: string
  win: boolean
  kills: number
  deaths: number
  assists: number
  csTotal: number
  goldEarned: number
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
