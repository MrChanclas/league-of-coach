export type TabKey = 'cuentas' | 'aprendizaje' | 'objetivos' | 'usuarios'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: string
}

export type AuthPayload = {
  user: AuthUser
  token: string
}

export type AccountCard = {
  id: string
  userId: string
  summoner: string
  tag: string
  server: string
  division: string
  tier: string
  lp: number
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
