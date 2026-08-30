import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { AuthScreen } from './components/AuthScreen'
import { DashboardScreen } from './components/DashboardScreen'
import type {
  AccountForm,
  AuthPayload,
  AuthUser,
  DashboardPayload,
  TabKey,
} from './types/dashboard'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4100').replace(/\/$/, '')

const blankAccountForm: AccountForm = {
  summoner: '',
  tag: '',
  server: 'LAS',
}

function App() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('cuentas')
  const [currentAccountId, setCurrentAccountId] = useState('')
  const [accountForm, setAccountForm] = useState<AccountForm>(blankAccountForm)
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const storedUser = localStorage.getItem('loc_user')
    return storedUser ? (JSON.parse(storedUser) as AuthUser) : null
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('loc_token'))

  useEffect(() => {
    if (token) {
      localStorage.setItem('loc_token', token)
    } else {
      localStorage.removeItem('loc_token')
    }
  }, [token])

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('loc_user', JSON.stringify(currentUser))
    } else {
      localStorage.removeItem('loc_user')
    }
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) {
      setDashboard(null)
      setCurrentAccountId('')
      return
    }

    const loadDashboard = async () => {
      try {
        setIsLoadingDashboard(true)
        const response = await fetch(`${API_URL}/users/${currentUser.id}/dashboard`, {
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
  }, [currentUser?.id, token])

  useEffect(() => {
    if (!currentUser) return

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    if (!code || !state) return

    const finalizeRiotConnection = async () => {
      try {
        const response = await fetch(
          `${API_URL}/auth/riot/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          },
        )

        const payload = (await response.json()) as { message?: string; pending?: boolean; userId?: string }

        if (!response.ok) {
          throw new Error(payload.message ?? 'No se pudo completar la conexión con Riot.')
        }

        if (payload.pending) {
          setStatus('Riot OAuth está listo pero falta configurar las credenciales del cliente en el backend.')
        } else {
          setStatus(payload.message ?? 'Cuenta de Riot vinculada correctamente.')
        }

        const dashboardResponse = await fetch(`${API_URL}/users/${currentUser.id}/dashboard`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })

        if (dashboardResponse.ok) {
          const nextDashboard = (await dashboardResponse.json()) as DashboardPayload
          setDashboard(nextDashboard)
          if (nextDashboard.accounts.length > 0) {
            setCurrentAccountId(nextDashboard.accounts[0].id)
          }
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'No se pudo completar la vinculación con Riot.')
      } finally {
        window.history.replaceState({}, '', window.location.pathname)
      }
    }

    finalizeRiotConnection()
  }, [currentUser?.id, token])

  const userDisplayName = useMemo(() => currentUser?.name ?? 'League of Coach', [currentUser])
  const userDisplayEmail = useMemo(() => currentUser?.email ?? 'coach@leagueofcoach.com', [currentUser])
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

  const handleFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  const handleAccountFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setAccountForm((previous: AccountForm) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_URL}/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      })

      const payload = (await response.json()) as AuthPayload & { message?: string }

      if (!response.ok) {
        throw new Error(payload.message ?? 'No se pudo completar la autenticación.')
      }

      setCurrentUser(payload.user)
      setToken(payload.token)
      setStatus(authMode === 'register' ? 'Cuenta creada correctamente.' : 'Sesión iniciada correctamente.')
      setForm({ name: '', email: '', password: '' })
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Hubo un error al conectar con la API.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentUser) return

    try {
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
          userId: currentUser.id,
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
      const updatedDashboard = await fetch(`${API_URL}/users/${currentUser.id}/dashboard`, {
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

  const handleAddRiotAccount = async () => {
    if (!currentUser || !token) return

    try {
      const response = await fetch(`${API_URL}/auth/riot/authorize`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const payload = (await response.json()) as { url?: string; message?: string }

      if (!response.ok || !payload.url) {
        throw new Error(payload.message ?? 'No se pudo iniciar la autenticación con Riot.')
      }

      window.location.href = payload.url
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo redirigir a Riot.')
    }
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setToken(null)
    setDashboard(null)
    setStatus('Sesión cerrada.')
  }

  if (!token || !currentUser) {
    return (
      <AuthScreen
        authMode={authMode}
        form={form}
        status={status}
        isSubmitting={isSubmitting}
        apiUrl={API_URL}
        onModeChange={setAuthMode}
        onFieldChange={handleFieldChange}
        onSubmit={handleSubmit}
      />
    )
  }

  return (
    <DashboardScreen
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
      onTabChange={setActiveTab}
      onLogout={handleLogout}
      onAddRiotAccount={handleAddRiotAccount}
      onSetCurrentAccountId={setCurrentAccountId}
      onAccountFieldChange={handleAccountFieldChange}
      onCreateAccount={handleCreateAccount}
    />
  )
}

export default App
