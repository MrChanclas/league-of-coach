export type StrikeSeverity = 'leve' | 'moderado' | 'grave'
export type ReportDecision = 'dismiss' | StrikeSeverity

export type AdminAccountSummary = {
  id: string
  summoner: string
  tag: string
  server: string
  soloTier: string
  soloDivision: string
  soloLp: number
}

export type AdminStanding = {
  activePoints: number
  banned: boolean
  bannedUntil: string | null
}

export type AdminOverview = {
  users: number
  accounts: number
  activeDuos: number
  pendingReports: number
  usersWithStrikes: number
  bannedUsers: number
}

export type AdminUser = AdminStanding & {
  id: string
  name: string
  email: string
  discordUsername: string | null
  createdAt: string
  lookingForDuo: boolean
  accounts: AdminAccountSummary[]
}

export type AdminStrike = {
  id: string
  severity: StrikeSeverity
  points: number
  reason: string
  createdAt: string
  expiresAt: string
  revokedAt: string | null
  reportId: string | null
  // Computed by the backend: neither revoked nor expired.
  active: boolean
}

export type AdminDuo = {
  id: string
  queue: string
  createdAt: string
  endedAt: string | null
  userA: { id: string; name: string }
  userB: { id: string; name: string }
  accountA: AdminAccountSummary
  accountB: AdminAccountSummary
  _count: { reports: number; messages: number }
}

type ReportParty = { id: string; name: string; account: AdminAccountSummary }

export type AdminReport = {
  id: string
  reason: string
  status: 'pending' | 'dismissed' | 'sanctioned'
  createdAt: string
  resolvedAt: string | null
  strikes: { severity: StrikeSeverity; points: number; reason: string }[]
  duo: { id: string; queue: string; createdAt: string }
  reporter: ReportParty
  reported: ReportParty & AdminStanding
}

export type AdminLoginResponse = {
  token: string
  expiresAt: string
}
