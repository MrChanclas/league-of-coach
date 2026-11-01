import { useCallback, useEffect, useMemo, useState } from 'react'
import './styles/index.css'
import { AuthenticateWithRedirectCallback, useAuth, useClerk, useUser } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import { DashboardScreen } from './components/layout/DashboardScreen'
import {
  useAddPoolEntryMutation,
  useCompleteOnboardingMutation,
  useCreateGoalMutation,
  useDeleteAccountMutation,
  useDeleteUserMutation,
  useDeleteGoalMutation,
  useSavePoolMutation,
  useStartAccountVerificationMutation,
} from './hooks/useApiMutations'
import {
  useAccountActivity,
  useAccountBehaviorFlags,
  useAccountLanes,
  useAccountLessons,
  useAccountMatches,
  useAccountPool,
  useAccountPoolRecommendation,
  useAccountRankHistory,
  useAccountStats,
  useAccountStreak,
  useChampionRoster,
  useDashboard,
  useInternalUser,
} from './hooks/useApiQueries'
import { useMatchSync } from './hooks/useMatchSync'
import { useStatusMessage } from './hooks/useStatusMessage'
import { useTabNavigation } from './hooks/useTabNavigation'
import { getDdragonVersion } from './lib/riotAssets'
import { BLANK_ACCOUNT_FORM, HOME_RECENT_DAYS, queryKeys } from './constants'
import type { AccountVerificationChallenge, AccountVerificationTarget } from './types/api'
import type { AccountForm, GoalCreateInput, PoolSlotKey, ReplacePoolEntryInput, TimeRange } from './types/dashboard'

function App() {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()
  const queryClient = useQueryClient()

  const { activeTab, handleTabChange } = useTabNavigation(isSignedIn)
  const [currentAccountId, setCurrentAccountId] = useState('')
  const [accountForm, setAccountForm] = useState<AccountForm>(BLANK_ACCOUNT_FORM)
  const [verification, setVerification] = useState<AccountVerificationChallenge | null>(null)
  const [status, setStatus] = useStatusMessage()
  const [ddragonVersion, setDdragonVersion] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const { syncMatches, isSyncing, lastSyncedLabel } = useMatchSync(currentAccountId, setStatus)

  useEffect(() => {
    void getDdragonVersion().then(setDdragonVersion)
  }, [])

  const userDisplayName = useMemo(
    () => user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'League of Coach',
    [user],
  )
  const userDisplayEmail = useMemo(
    () => user?.primaryEmailAddress?.emailAddress ?? '',
    [user],
  )

  const internalUserQuery = useInternalUser(
    Boolean(isSignedIn),
    user?.id,
    user?.fullName ?? 'Coach',
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

  const primaryQueue = activeAccount && activeAccount.soloTier !== 'Unranked' ? 'solo' : 'flex'
  // Until verified an account is read-only: the backend refuses lessons, pool
  // and goals, so they aren't asked for either.
  const verifiedAccountId = activeAccount?.verifiedAt ? currentAccountId : ''

  const matchesQuery = useAccountMatches(currentAccountId)
  const statsQuery = useAccountStats(currentAccountId)
  // The home's account band follows the "7 días / Split" toggle; on "Split"
  // it's the same query as statsQuery, which React Query dedupes.
  const homeStatsQuery = useAccountStats(
    currentAccountId,
    undefined,
    timeRange === '7d' ? HOME_RECENT_DAYS : undefined,
  )
  const streakQuery = useAccountStreak(currentAccountId)
  const lanesQuery = useAccountLanes(currentAccountId)
  const activityQuery = useAccountActivity(currentAccountId)
  const rankHistoryQuery = useAccountRankHistory(currentAccountId, primaryQueue)
  const lessonsQuery = useAccountLessons(verifiedAccountId)
  // These two are slow to compute and only the tabs that show them need them.
  const behaviorFlagsQuery = useAccountBehaviorFlags(
    verifiedAccountId,
    activeTab === 'aprendizaje' || activeTab === 'objetivos',
  )
  const championRosterQuery = useChampionRoster()
  const poolQuery = useAccountPool(verifiedAccountId)
  const poolRecommendationQuery = useAccountPoolRecommendation(verifiedAccountId, activeTab === 'pool-champ')

  const matches = matchesQuery.data?.items ?? []
  const statsSummary = statsQuery.data ?? null
  const streak = streakQuery.data ?? null
  const lanes = lanesQuery.data ?? []
  const weeklyActivity = activityQuery.data ?? []
  const rankHistory = rankHistoryQuery.data ?? []
  const lessons = lessonsQuery.data ?? []
  const behaviorFlags = behaviorFlagsQuery.data ?? []
  const championRoster = championRosterQuery.data ?? []

  const goalsByAccount = useMemo(
    () => (activeAccount?.verifiedAt ? (dashboard?.goals ?? []).filter((goal) => goal.accountId === activeAccount.id) : []),
    [activeAccount, dashboard],
  )

  const startVerificationMutation = useStartAccountVerificationMutation()
  const deleteAccountMutation = useDeleteAccountMutation()
  const deleteUserMutation = useDeleteUserMutation()
  const createGoalMutation = useCreateGoalMutation()
  const deleteGoalMutation = useDeleteGoalMutation()
  const completeOnboardingMutation = useCompleteOnboardingMutation()
  const savePoolMutation = useSavePoolMutation()
  const addPoolEntryMutation = useAddPoolEntryMutation()

  const handleCompleteOnboarding = () => {
    if (!internalUser) return
    completeOnboardingMutation.mutate(internalUser.id, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.internalUser(user?.id) }),
    })
  }

  const handleAccountFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setAccountForm((previous: AccountForm) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleStartVerification = async (target: AccountVerificationTarget) => {
    try {
      setVerification(await startVerificationMutation.mutateAsync(target))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo iniciar la verificación.')
    }
  }

  // An account is only linked by passing the icon check, so the form just
  // starts it. Riot's lookup errors stay on the form, where they can be fixed.
  const handleCreateAccount = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    void handleStartVerification({
      summoner: accountForm.summoner,
      tag: accountForm.tag,
      server: accountForm.server,
    })
  }

  // Stable on purpose: the verification modal's automatic check depends on it.
  const handleAccountVerified = useCallback(
    (accountId: string) => {
      setCurrentAccountId(accountId)
      setAccountForm(BLANK_ACCOUNT_FORM)
      setStatus('Cuenta verificada. Sincroniza sus partidas para que el análisis sea preciso.')
    },
    [setStatus],
  )

  const handleSyncMatches = () => {
    if (activeAccount && !activeAccount.verifiedAt) {
      setStatus('Verifica esta cuenta para sincronizar sus partidas.')
      return
    }
    void syncMatches()
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

  const handleSavePool = async (entries: ReplacePoolEntryInput[]): Promise<boolean> => {
    if (!currentAccountId) return false

    try {
      // Origin reflects how this save was built: as soon as the coach's
      // suggestion contributed any slot, the pool counts as coach-sourced —
      // matches the "armada con la recomendación del coach" provenance line.
      const source = entries.some((entry) => entry.addedBy === 'coach') ? 'coach' : 'manual'
      await savePoolMutation.mutateAsync({ accountId: currentAccountId, input: { source, entries } })
      await queryClient.invalidateQueries({ queryKey: queryKeys.account(currentAccountId) })
      setStatus('Pool guardado correctamente.')
      return true
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo guardar el pool.')
      return false
    }
  }

  const handleAddPoolOutsider = async (championKey: string, role: PoolSlotKey) => {
    if (!currentAccountId) return

    try {
      await addPoolEntryMutation.mutateAsync({ accountId: currentAccountId, championKey, role })
      await queryClient.invalidateQueries({ queryKey: queryKeys.account(currentAccountId) })
      setStatus('Campeón sumado al pool.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo sumar el campeón al pool.')
    }
  }

  const handleDeleteUser = async () => {
    if (!internalUser) return
    const confirmed = window.confirm(
      '¿Seguro que quieres eliminar tu cuenta de League of Coach? Se borrarán tus cuentas vinculadas, objetivos, pools, duos y chats. No se puede deshacer.',
    )
    if (!confirmed) return

    try {
      await deleteUserMutation.mutateAsync(internalUser.id)
      queryClient.clear()
      // The Clerk identity is already gone, so signOut may have nothing left to end.
      await signOut().catch(() => undefined)
      window.location.assign('/')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo eliminar tu cuenta.')
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
      goalsByAccount={goalsByAccount}
      status={status}
      isLoadingDashboard={dashboardQuery.isLoading}
      accountForm={accountForm}
      matches={matches}
      hasOlderMatches={matchesQuery.data?.hasOlderMatches ?? false}
      historyWindowDays={matchesQuery.data?.windowDays ?? null}
      statsSummary={statsSummary}
      homeStatsSummary={homeStatsQuery.data ?? null}
      streak={streak}
      lanes={lanes}
      weeklyActivity={weeklyActivity}
      rankHistory={rankHistory}
      lessons={lessons}
      behaviorFlags={behaviorFlags}
      ddragonVersion={ddragonVersion}
      timeRange={timeRange}
      isSyncing={isSyncing}
      lastSyncedLabel={lastSyncedLabel}
      championRoster={championRoster}
      poolView={poolQuery.data}
      poolRecommendation={poolRecommendationQuery.data}
      isPoolRecommendationLoading={poolRecommendationQuery.isLoading}
      isSavingPool={savePoolMutation.isPending}
      onSavePool={handleSavePool}
      onAddPoolOutsider={handleAddPoolOutsider}
      onboardingCompletedAt={internalUser?.onboardingCompletedAt}
      onCompleteOnboarding={handleCompleteOnboarding}
      onTimeRangeChange={setTimeRange}
      onTabChange={handleTabChange}
      onLogout={handleLogout}
      onSetCurrentAccountId={setCurrentAccountId}
      onAccountFieldChange={handleAccountFieldChange}
      onCreateAccount={handleCreateAccount}
      onDeleteAccount={handleDeleteAccount}
      onSyncMatches={handleSyncMatches}
      onCreateGoal={handleCreateGoal}
      onDeleteGoal={handleDeleteGoal}
      verification={verification}
      isStartingVerification={startVerificationMutation.isPending}
      onVerifyAccount={(target) => void handleStartVerification(target)}
      onAccountVerified={handleAccountVerified}
      onCloseVerification={() => setVerification(null)}
      onDeleteUser={() => void handleDeleteUser()}
    />
  )
}

export default App
