import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { AuthenticateWithRedirectCallback, useAuth, useClerk, useUser } from '@clerk/clerk-react'
import { DashboardScreen } from './components/DashboardScreen'
import { API_URL, fetchJson } from './lib/api'
import { getDdragonVersion } from './lib/riotAssets'
import type {
  AccountForm,
  AccountStatsSummary,
  ActivityDay,
  AuthUser,
  ChampionSplitStat,
  DashboardPayload,
  LaneEntry,
  LessonCard,
  MasteryEntry,
  MatchParticipantEntry,
  RankSnapshotEntry,
  StreakInfo,
  TabKey,
  TimeRange,
} from './types/dashboard'

const blankAccountForm: AccountForm = {
  summoner: '',
  tag: '',
  server: 'LAS',
}

function App() {
  const { isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()

  const [activeTab, setActiveTab] = useState<TabKey>('cuentas')
  const [currentAccountId, setCurrentAccountId] = useState('')
  const [accountForm, setAccountForm] = useState<AccountForm>(blankAccountForm)
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false)
  const [status, setStatus] = useState('')
  const [internalUser, setInternalUser] = useState<AuthUser | null>(null)
  const [ddragonVersion, setDdragonVersion] = useState<string | null>(null)

  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  const [matches, setMatches] = useState<MatchParticipantEntry[]>([])
  const [mastery, setMastery] = useState<MasteryEntry[]>([])
  const [statsSummary, setStatsSummary] = useState<AccountStatsSummary | null>(null)
  const [streak, setStreak] = useState<StreakInfo | null>(null)
  const [lanes, setLanes] = useState<LaneEntry[]>([])
  const [weeklyActivity, setWeeklyActivity] = useState<ActivityDay[]>([])
  const [championsSplit, setChampionsSplit] = useState<ChampionSplitStat[]>([])
  const [lessons, setLessons] = useState<LessonCard[]>([])

  useEffect(() => {
    void getDdragonVersion().then(setDdragonVersion)
  }, [])

  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(''), 5000)
    return () => clearTimeout(timer)
  }, [status])

  useEffect(() => {
    if (!isSignedIn || !user) {
      setInternalUser(null)
      return
    }

    let cancelled = false

    const resolveUser = async () => {
      try {
        const token = await getToken()
        const response = await fetch(`${API_URL}/users/me`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name: user.fullName ?? user.primaryEmailAddress?.emailAddress ?? 'Coach',
            email: user.primaryEmailAddress?.emailAddress ?? '',
          }),
        })

        if (!response.ok) {
          throw new Error('No se pudo resolver el usuario.')
        }

        const payload = (await response.json()) as AuthUser
        if (!cancelled) {
          setInternalUser(payload)
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : 'No se pudo resolver el usuario.')
        }
      }
    }

    resolveUser()

    return () => {
      cancelled = true
    }
  }, [isSignedIn, user, getToken])

  useEffect(() => {
    if (!internalUser) {
      setDashboard(null)
      setCurrentAccountId('')
      return
    }

    const loadDashboard = async () => {
      try {
        setIsLoadingDashboard(true)
        const token = await getToken()
        const response = await fetch(`${API_URL}/users/${internalUser.id}/dashboard`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })

        if (!response.ok) {
          throw new Error('No se pudo cargar el dashboard del usuario.')
        }

        const payload = (await response.json()) as DashboardPayload
        setDashboard(payload)
        if (payload.accounts.length > 0) {
          setCurrentAccountId((previous) => previous || payload.accounts[0].id)
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'No se pudo cargar el dashboard.')
      } finally {
        setIsLoadingDashboard(false)
      }
    }

    loadDashboard()
  }, [internalUser, getToken])

  const userAccounts = useMemo(() => dashboard?.accounts ?? [], [dashboard])

  const activeAccount = useMemo(
    () => userAccounts.find((account) => account.id === currentAccountId) ?? userAccounts[0],
    [currentAccountId, userAccounts],
  )

  const loadAccountData = async () => {
    if (!currentAccountId) {
      setMatches([])
      setMastery([])
      setStatsSummary(null)
      setStreak(null)
      setLanes([])
      setWeeklyActivity([])
      setChampionsSplit([])
      setLessons([])
      return
    }

    const token = await getToken()
    const splitDays = timeRange === '7d' ? 7 : 30
    const account = userAccounts.find((entry) => entry.id === currentAccountId)
    const primaryQueue = account && account.soloTier !== 'Unranked' ? 'solo' : 'flex'

    const [
      matchesResult,
      masteryResult,
      statsResult,
      streakResult,
      lanesResult,
      activityResult,
      championsResult,
      rankHistoryResult,
      lessonsResult,
    ] = await Promise.all([
      fetchJson<{ items: MatchParticipantEntry[] }>(`/matches/account/${currentAccountId}?pageSize=20`, token),
      fetchJson<MasteryEntry[]>(`/mastery/account/${currentAccountId}`, token),
      fetchJson<AccountStatsSummary>(`/stats/account/${currentAccountId}`, token),
      fetchJson<StreakInfo>(`/stats/account/${currentAccountId}/streak`, token),
      fetchJson<LaneEntry[]>(`/stats/account/${currentAccountId}/lanes`, token),
      fetchJson<ActivityDay[]>(`/stats/account/${currentAccountId}/activity?days=7`, token),
      fetchJson<ChampionSplitStat[]>(`/stats/account/${currentAccountId}/champions?days=${splitDays}`, token),
      fetchJson<RankSnapshotEntry[]>(`/accounts/${currentAccountId}/rank-history?queue=${primaryQueue}&days=90`, token),
      fetchJson<LessonCard[]>(`/learning/account/${currentAccountId}/lessons`, token),
    ])

    setMatches(matchesResult?.items ?? [])
    setMastery(masteryResult ?? [])
    setStatsSummary(statsResult)
    setStreak(streakResult)
    setLanes(lanesResult ?? [])
    setWeeklyActivity(activityResult ?? [])
    setChampionsSplit(championsResult ?? [])
    setLessons(lessonsResult ?? [])

    return rankHistoryResult ?? []
  }

  const [rankHistory, setRankHistory] = useState<RankSnapshotEntry[]>([])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const history = await loadAccountData()
      if (!cancelled) {
        setRankHistory(history ?? [])
      }
    }

    void run()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccountId, timeRange, getToken])

  const goalsByAccount = useMemo(
    () => (dashboard?.goals ?? []).filter((goal) => goal.accountId === (activeAccount?.id ?? '')),
    [activeAccount, dashboard],
  )

  const handleAccountFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setAccountForm((previous: AccountForm) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleCreateAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!internalUser) return

    try {
      const token = await getToken()
      const response = await fetch(`${API_URL}/accounts/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          summoner: accountForm.summoner,
          tag: accountForm.tag,
          server: accountForm.server,
          userId: internalUser.id,
        }),
      })

      const payload = (await response.json()) as {
        message?: string
        found?: boolean
        created?: boolean
      }

      if (!response.ok || !payload.found) {
        throw new Error(payload?.message ?? 'No se pudo detectar la cuenta de Riot.')
      }

      setAccountForm(blankAccountForm)
      const updatedDashboard = await fetch(`${API_URL}/users/${internalUser.id}/dashboard`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (updatedDashboard.ok) {
        const data = (await updatedDashboard.json()) as DashboardPayload
        setDashboard(data)
        if (data.accounts.length > 0) {
          setCurrentAccountId((previous) => previous || data.accounts[0].id)
        }
      }

      const baseMessage = payload.message ?? 'Cuenta detectada y vinculada correctamente.'
      setStatus(
        payload.created
          ? `${baseMessage} Sincroniza sus partidas para que el análisis sea preciso.`
          : baseMessage,
      )
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo detectar la cuenta.')
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    if (!internalUser) return

    try {
      const token = await getToken()
      const response = await fetch(`${API_URL}/accounts/${accountId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (!response.ok) {
        throw new Error('No se pudo eliminar la cuenta.')
      }

      const updatedDashboard = await fetch(`${API_URL}/users/${internalUser.id}/dashboard`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (updatedDashboard.ok) {
        const data = (await updatedDashboard.json()) as DashboardPayload
        setDashboard(data)
        setCurrentAccountId((previous) =>
          previous === accountId ? (data.accounts[0]?.id ?? '') : previous,
        )
      }

      setStatus('Cuenta eliminada correctamente.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo eliminar la cuenta.')
    }
  }

  const handleSyncMatches = async () => {
    if (!currentAccountId) return

    try {
      setIsSyncing(true)
      const token = await getToken()
      const response = await fetch(`${API_URL}/matches/sync/${currentAccountId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      })

      const payload = (await response.json()) as { synced?: number; skipped?: number; message?: string }

      if (!response.ok) {
        throw new Error(payload.message ?? 'No se pudieron sincronizar las partidas.')
      }

      setStatus(`Se sincronizaron ${payload.synced ?? 0} partidas nuevas (${payload.skipped ?? 0} ya existían).`)
      setLastSyncedAt(new Date())

      const history = await loadAccountData()
      setRankHistory(history ?? [])
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudieron sincronizar las partidas.')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleLogout = () => {
    setStatus('Sesión cerrada.')
    void signOut()
  }

  const userDisplayName = useMemo(
    () => user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'League of Coach',
    [user],
  )
  const userDisplayEmail = useMemo(
    () => user?.primaryEmailAddress?.emailAddress ?? 'coach@leagueofcoach.com',
    [user],
  )

  const lastSyncedLabel = useMemo(() => {
    if (!lastSyncedAt) return 'Sin sincronizar en esta sesión'
    const minutes = Math.max(0, Math.round((Date.now() - lastSyncedAt.getTime()) / 60_000))
    if (minutes < 1) return 'Sincronizado hace instantes'
    return `Sincronizado hace ${minutes} min`
  }, [lastSyncedAt])

  if (window.location.pathname === '/sso-callback') {
    return <AuthenticateWithRedirectCallback signInForceRedirectUrl="/" signUpForceRedirectUrl="/" />
  }

  return (
    <DashboardScreen
      isSignedIn={Boolean(isSignedIn)}
      userDisplayName={userDisplayName}
      userDisplayEmail={userDisplayEmail}
      activeTab={activeTab}
      userAccounts={userAccounts}
      currentAccountId={currentAccountId}
      activeAccount={activeAccount}
      goalsByAccount={goalsByAccount}
      status={status}
      isLoadingDashboard={isLoadingDashboard}
      accountForm={accountForm}
      matches={matches}
      mastery={mastery}
      statsSummary={statsSummary}
      streak={streak}
      lanes={lanes}
      weeklyActivity={weeklyActivity}
      championsSplit={championsSplit}
      rankHistory={rankHistory}
      lessons={lessons}
      ddragonVersion={ddragonVersion}
      timeRange={timeRange}
      isSyncing={isSyncing}
      lastSyncedLabel={lastSyncedLabel}
      onTimeRangeChange={setTimeRange}
      onTabChange={setActiveTab}
      onLogout={handleLogout}
      onSetCurrentAccountId={setCurrentAccountId}
      onAccountFieldChange={handleAccountFieldChange}
      onCreateAccount={handleCreateAccount}
      onDeleteAccount={handleDeleteAccount}
      onSyncMatches={handleSyncMatches}
    />
  )
}

export default App
