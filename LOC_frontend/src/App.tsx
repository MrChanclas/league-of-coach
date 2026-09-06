import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { AuthenticateWithRedirectCallback, useAuth, useClerk, useUser } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import { DashboardScreen } from './components/layout/DashboardScreen'
import {
  useCreateGoalMutation,
  useDeleteAccountMutation,
  useDeleteGoalMutation,
  useResolveAccountMutation,
  useSyncMatchesMutation,
} from './hooks/useApiMutations'
import {
  queryKeys,
  useAccountActivity,
  useAccountChampions,
  useAccountLanes,
  useAccountLessons,
  useAccountMatches,
  useAccountRankHistory,
  useAccountStats,
  useAccountStreak,
  useDashboard,
  useInternalUser,
} from './hooks/useApiQueries'
import { getDdragonVersion } from './lib/riotAssets'
import type { AccountForm, GoalCreateInput, TabKey, TimeRange } from './types/dashboard'

function formatLastSyncedLabel(lastSyncedAt: Date | null): string {
  if (!lastSyncedAt) return 'Sin sincronizar en esta sesión'
  const minutes = Math.max(0, Math.round((Date.now() - lastSyncedAt.getTime()) / 60_000))
  if (minutes < 1) return 'Sincronizado hace instantes'
  return `Sincronizado hace ${minutes} min`
}

const blankAccountForm: AccountForm = {
  summoner: '',
  tag: '',
  server: 'LAS',
}

function App() {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabKey>('cuentas')
  const [currentAccountId, setCurrentAccountId] = useState('')
  const [accountForm, setAccountForm] = useState<AccountForm>(blankAccountForm)
  const [status, setStatus] = useState('')
  const [ddragonVersion, setDdragonVersion] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  useEffect(() => {
    void getDdragonVersion().then(setDdragonVersion)
  }, [])

  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(''), 5000)
    return () => clearTimeout(timer)
  }, [status])

  const userDisplayName = useMemo(
    () => user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'League of Coach',
    [user],
  )
  const userDisplayEmail = useMemo(
    () => user?.primaryEmailAddress?.emailAddress ?? 'coach@leagueofcoach.com',
    [user],
  )

  const internalUserQuery = useInternalUser(
    Boolean(isSignedIn),
    user?.id,
    user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'Coach',
    user?.primaryEmailAddress?.emailAddress ?? '',
  )
  const internalUser = internalUserQuery.data

  const dashboardQuery = useDashboard(internalUser?.id)
  const dashboard = dashboardQuery.data ?? null
  const userAccounts = useMemo(() => dashboard?.accounts ?? [], [dashboard])

  // Keeps the selection valid as the dashboard identity/content changes:
  // cleared on sign-out (dashboard becomes null), defaulted to the first
  // account on load, and re-validated whenever the account list changes
  // (e.g. falls back to the first remaining account right after a delete).
  // Adjusting state during render, rather than in an effect, avoids an extra
  // commit-then-rerender pass for what's really a render-time derivation —
  // see https://react.dev/learn/you-might-not-need-an-effect.
  const [syncedDashboard, setSyncedDashboard] = useState(dashboard)
  if (dashboard !== syncedDashboard) {
    setSyncedDashboard(dashboard)
    setCurrentAccountId((previous) => {
      if (!dashboard) return ''
      if (previous && dashboard.accounts.some((account) => account.id === previous)) return previous
      return dashboard.accounts[0]?.id ?? ''
    })
  }

  const activeAccount = useMemo(
    () => userAccounts.find((account) => account.id === currentAccountId) ?? userAccounts[0],
    [currentAccountId, userAccounts],
  )

  const splitDays = timeRange === '7d' ? 7 : 30
  const primaryQueue = activeAccount && activeAccount.soloTier !== 'Unranked' ? 'solo' : 'flex'

  const matchesQuery = useAccountMatches(currentAccountId)
  const statsQuery = useAccountStats(currentAccountId)
  const streakQuery = useAccountStreak(currentAccountId)
  const lanesQuery = useAccountLanes(currentAccountId)
  const activityQuery = useAccountActivity(currentAccountId)
  const championsQuery = useAccountChampions(currentAccountId, splitDays)
  const rankHistoryQuery = useAccountRankHistory(currentAccountId, primaryQueue)
  const lessonsQuery = useAccountLessons(currentAccountId)

  const matches = matchesQuery.data?.items ?? []
  const statsSummary = statsQuery.data ?? null
  const streak = streakQuery.data ?? null
  const lanes = lanesQuery.data ?? []
  const weeklyActivity = activityQuery.data ?? []
  const championsSplit = championsQuery.data ?? []
  const rankHistory = rankHistoryQuery.data ?? []
  const lessons = lessonsQuery.data ?? []

  const goalsByAccount = useMemo(
    () => (dashboard?.goals ?? []).filter((goal) => goal.accountId === (activeAccount?.id ?? '')),
    [activeAccount, dashboard],
  )

  const resolveAccountMutation = useResolveAccountMutation()
  const deleteAccountMutation = useDeleteAccountMutation()
  const createGoalMutation = useCreateGoalMutation()
  const deleteGoalMutation = useDeleteGoalMutation()
  const syncMatchesMutation = useSyncMatchesMutation()

  const handleAccountFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setAccountForm((previous: AccountForm) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleCreateAccount = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!internalUser) return

    try {
      const payload = await resolveAccountMutation.mutateAsync({
        summoner: accountForm.summoner,
        tag: accountForm.tag,
        server: accountForm.server,
        userId: internalUser.id,
      })

      setAccountForm(blankAccountForm)
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(internalUser.id) })

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
      await deleteAccountMutation.mutateAsync(accountId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(internalUser.id) })
      setCurrentAccountId((previous) => (previous === accountId ? '' : previous))
      setStatus('Cuenta eliminada correctamente.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo eliminar la cuenta.')
    }
  }

  const handleCreateGoal = async (input: GoalCreateInput): Promise<boolean> => {
    try {
      await createGoalMutation.mutateAsync(input)
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(internalUser?.id) })
      setStatus('Objetivo creado correctamente.')
      return true
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo crear el objetivo.')
      return false
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoalMutation.mutateAsync(goalId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(internalUser?.id) })
      setStatus('Objetivo eliminado correctamente.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo eliminar el objetivo.')
    }
  }

  const handleSyncMatches = async () => {
    if (!currentAccountId) return

    try {
      const payload = await syncMatchesMutation.mutateAsync(currentAccountId)
      const relinkedNote = payload.relinked ? `, ${payload.relinked} recuperadas de cuentas compartidas` : ''
      setStatus(
        `Se sincronizaron ${payload.synced ?? 0} partidas nuevas (${payload.skipped ?? 0} ya existían${relinkedNote}).`,
      )
      setLastSyncedAt(new Date())
      await queryClient.invalidateQueries({ queryKey: queryKeys.account(currentAccountId) })
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudieron sincronizar las partidas.')
    }
  }

  const handleLogout = () => {
    setStatus('Sesión cerrada.')
    void signOut()
  }

  // Not memoized: it depends on the current time, not just `lastSyncedAt`, so
  // memoizing it would freeze the label's wording at whatever it was right
  // after the sync instead of it staying accurate as time passes.
  const lastSyncedLabel = formatLastSyncedLabel(lastSyncedAt)

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
      isLoadingDashboard={dashboardQuery.isLoading}
      accountForm={accountForm}
      matches={matches}
      statsSummary={statsSummary}
      streak={streak}
      lanes={lanes}
      weeklyActivity={weeklyActivity}
      championsSplit={championsSplit}
      rankHistory={rankHistory}
      lessons={lessons}
      ddragonVersion={ddragonVersion}
      timeRange={timeRange}
      isSyncing={syncMatchesMutation.isPending}
      lastSyncedLabel={lastSyncedLabel}
      onTimeRangeChange={setTimeRange}
      onTabChange={setActiveTab}
      onLogout={handleLogout}
      onSetCurrentAccountId={setCurrentAccountId}
      onAccountFieldChange={handleAccountFieldChange}
      onCreateAccount={handleCreateAccount}
      onDeleteAccount={handleDeleteAccount}
      onSyncMatches={handleSyncMatches}
      onCreateGoal={handleCreateGoal}
      onDeleteGoal={handleDeleteGoal}
    />
  )
}

export default App
