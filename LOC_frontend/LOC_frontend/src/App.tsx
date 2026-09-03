import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { AuthenticateWithRedirectCallback, useAuth, useClerk, useUser } from '@clerk/clerk-react'
import { DashboardScreen } from './components/DashboardScreen'
import { API_URL } from './lib/api'
import type {
  AccountForm,
  AccountStatsSummary,
  AuthUser,
  DashboardPayload,
  MasteryEntry,
  MatchParticipantEntry,
  TabKey,
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
  const [matches, setMatches] = useState<MatchParticipantEntry[]>([])
  const [mastery, setMastery] = useState<MasteryEntry[]>([])
  const [statsSummary, setStatsSummary] = useState<AccountStatsSummary | null>(null)
  const [isLoadingMatches, setIsLoadingMatches] = useState(false)
  const [status, setStatus] = useState('')
  const [internalUser, setInternalUser] = useState<AuthUser | null>(null)

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
          setCurrentAccountId(payload.accounts[0].id)
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'No se pudo cargar el dashboard.')
      } finally {
        setIsLoadingDashboard(false)
      }
    }

    loadDashboard()
  }, [internalUser, getToken])

  useEffect(() => {
    if (activeTab !== 'partidas' || !currentAccountId) {
      return
    }

    const loadMatchesData = async () => {
      try {
        setIsLoadingMatches(true)
        const token = await getToken()
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined

        const [matchesResponse, masteryResponse, statsResponse] = await Promise.all([
          fetch(`${API_URL}/matches/account/${currentAccountId}`, { headers }),
          fetch(`${API_URL}/mastery/account/${currentAccountId}`, { headers }),
          fetch(`${API_URL}/stats/account/${currentAccountId}`, { headers }),
        ])

        if (matchesResponse.ok) {
          const data = (await matchesResponse.json()) as { items: MatchParticipantEntry[] }
          setMatches(data.items)
        }

        if (masteryResponse.ok) {
          setMastery((await masteryResponse.json()) as MasteryEntry[])
        }

        if (statsResponse.ok) {
          setStatsSummary((await statsResponse.json()) as AccountStatsSummary)
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'No se pudieron cargar las partidas.')
      } finally {
        setIsLoadingMatches(false)
      }
    }

    loadMatchesData()
  }, [activeTab, currentAccountId, getToken])

  const userDisplayName = useMemo(
    () => user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'League of Coach',
    [user],
  )
  const userDisplayEmail = useMemo(
    () => user?.primaryEmailAddress?.emailAddress ?? 'coach@leagueofcoach.com',
    [user],
  )
  const userAccounts = useMemo(() => dashboard?.accounts ?? [], [dashboard])

  const activeAccount = useMemo(
    () => userAccounts.find((account) => account.id === currentAccountId) ?? userAccounts[0],
    [currentAccountId, userAccounts],
  )

  const goalsByAccount = useMemo(
    () => (dashboard?.goals ?? []).filter((goal) => goal.accountId === (activeAccount?.id ?? '')),
    [activeAccount, dashboard],
  )

  const championData = useMemo(() => dashboard?.learnings ?? [], [dashboard])

  const dashboardSummary = useMemo(
    () =>
      dashboard?.summary ?? {
        totalAccounts: 0,
        totalGoals: 0,
        totalLearnings: 0,
        activeFocus: 'Sin foco',
      },
    [dashboard],
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
          setCurrentAccountId(data.accounts[0].id)
        }
      }

      setStatus(payload.message ?? 'Cuenta detectada y vinculada correctamente.')
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

  const handleGoToAccountsTab = () => {
    setActiveTab('cuentas')
  }

  const handleSyncMatches = async () => {
    if (!currentAccountId) return

    try {
      setIsLoadingMatches(true)
      const token = await getToken()
      const response = await fetch(`${API_URL}/matches/sync/${currentAccountId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ count: 10 }),
      })

      const payload = (await response.json()) as { synced?: number; skipped?: number; message?: string }

      if (!response.ok) {
        throw new Error(payload.message ?? 'No se pudieron sincronizar las partidas.')
      }

      setStatus(`Se sincronizaron ${payload.synced ?? 0} partidas nuevas (${payload.skipped ?? 0} ya existían).`)

      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      const [matchesResponse, statsResponse] = await Promise.all([
        fetch(`${API_URL}/matches/account/${currentAccountId}`, { headers }),
        fetch(`${API_URL}/stats/account/${currentAccountId}`, { headers }),
      ])

      if (matchesResponse.ok) {
        const data = (await matchesResponse.json()) as { items: MatchParticipantEntry[] }
        setMatches(data.items)
      }

      if (statsResponse.ok) {
        setStatsSummary((await statsResponse.json()) as AccountStatsSummary)
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudieron sincronizar las partidas.')
    } finally {
      setIsLoadingMatches(false)
    }
  }

  const handleLogout = () => {
    setStatus('Sesión cerrada.')
    void signOut()
  }

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
      dashboardSummary={dashboardSummary}
      goalsByAccount={goalsByAccount}
      championData={championData}
      status={status}
      isLoadingDashboard={isLoadingDashboard}
      accountForm={accountForm}
      matches={matches}
      mastery={mastery}
      statsSummary={statsSummary}
      isLoadingMatches={isLoadingMatches}
      onTabChange={setActiveTab}
      onLogout={handleLogout}
      onGoToAccountsTab={handleGoToAccountsTab}
      onSetCurrentAccountId={setCurrentAccountId}
      onAccountFieldChange={handleAccountFieldChange}
      onCreateAccount={handleCreateAccount}
      onDeleteAccount={handleDeleteAccount}
      onSyncMatches={handleSyncMatches}
    />
  )
}

export default App
