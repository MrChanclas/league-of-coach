import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { AuthenticateWithRedirectCallback, useAuth, useClerk, useUser } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import { DashboardScreen } from './components/layout/DashboardScreen'
import {
  useAddPoolEntryMutation,
  useCompleteOnboardingMutation,
  useCreateGoalMutation,
  useDeleteAccountMutation,
  useDeleteGoalMutation,
  useResolveAccountMutation,
  useSavePoolMutation,
  useSyncMatchesMutation,
} from './hooks/useApiMutations'
import {
  queryKeys,
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
import { getDdragonVersion } from './lib/riotAssets'
import type {
  AccountForm,
  GoalCreateInput,
  PoolSlotKey,
  ReplacePoolEntryInput,
  TabKey,
  TimeRange,
} from './types/dashboard'

// Mirrors the tab in the URL hash so browser back/forward moves between
// tabs instead of leaving the app — see readTabFromLocation below.
const TAB_KEYS: TabKey[] = ['cuentas', 'aprendizaje', 'objetivos', 'partidas', 'pool-champ']

function readTabFromLocation(): TabKey | null {
  const hash = window.location.hash.replace('#', '')
  return (TAB_KEYS as string[]).includes(hash) ? (hash as TabKey) : null
}

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

  const [activeTab, setActiveTab] = useState<TabKey>(() => readTabFromLocation() ?? 'cuentas')
  const [currentAccountId, setCurrentAccountId] = useState('')
  const [accountForm, setAccountForm] = useState<AccountForm>(blankAccountForm)
  const [status, setStatus] = useState('')
  const [ddragonVersion, setDdragonVersion] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  // True while the season backfill keeps re-calling sync in the background;
  // the mutation itself is idle between rounds, so the button would
  // otherwise flicker back to «Sincronizar ahora» mid-catch-up.
  const [isCatchingUpSeason, setIsCatchingUpSeason] = useState(false)

  useEffect(() => {
    void getDdragonVersion().then(setDdragonVersion)
  }, [])

  // Back/forward moves between tabs (popstate) instead of leaving the app.
  useEffect(() => {
    function handlePopState() {
      setActiveTab(readTabFromLocation() ?? 'cuentas')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Right when the dashboard first mounts for a signed-in user — whether
  // from an existing session or straight off the Google OAuth redirect back
  // to '/' — replace (not push) the current history entry with the active
  // tab's URL. That overwrites whatever entry was showing the login screen,
  // so "back" from inside the app lands on a previous tab or the app's own
  // starting point instead of a stale pre-login render.
  useEffect(() => {
    if (isSignedIn) {
      window.history.replaceState(null, '', `#${activeTab}`)
    }
    // Only the transition into a signed-in session should reset the history
    // baseline — not every tab change, which is handled by handleTabChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn])

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab)
    if (tab !== activeTab) window.history.pushState(null, '', `#${tab}`)
  }

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

  const primaryQueue = activeAccount && activeAccount.soloTier !== 'Unranked' ? 'solo' : 'flex'

  const matchesQuery = useAccountMatches(currentAccountId)
  const statsQuery = useAccountStats(currentAccountId)
  const streakQuery = useAccountStreak(currentAccountId)
  const lanesQuery = useAccountLanes(currentAccountId)
  const activityQuery = useAccountActivity(currentAccountId)
  const rankHistoryQuery = useAccountRankHistory(currentAccountId, primaryQueue)
  const lessonsQuery = useAccountLessons(currentAccountId)
  const behaviorFlagsQuery = useAccountBehaviorFlags(currentAccountId)
  const championRosterQuery = useChampionRoster()
  const poolQuery = useAccountPool(currentAccountId)
  const poolRecommendationQuery = useAccountPoolRecommendation(currentAccountId)

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
    () => (dashboard?.goals ?? []).filter((goal) => goal.accountId === (activeAccount?.id ?? '')),
    [activeAccount, dashboard],
  )

  const resolveAccountMutation = useResolveAccountMutation()
  const deleteAccountMutation = useDeleteAccountMutation()
  const createGoalMutation = useCreateGoalMutation()
  const deleteGoalMutation = useDeleteGoalMutation()
  const syncMatchesMutation = useSyncMatchesMutation()
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

  // Each call only fetches as much history as Riot's rate limit allows, so a
  // first sync of a full season needs several rounds. The cap is a safety
  // net against an endless loop, not an expected stopping point: it covers
  // far more games than a single season can hold.
  const MAX_SYNC_ROUNDS = 60

  const handleSyncMatches = async () => {
    if (!currentAccountId) return

    let syncedTotal = 0
    let skippedTotal = 0
    let relinkedTotal = 0

    try {
      setIsCatchingUpSeason(true)

      for (let round = 0; round < MAX_SYNC_ROUNDS; round += 1) {
        const payload = await syncMatchesMutation.mutateAsync(currentAccountId)
        syncedTotal += payload.synced ?? 0
        skippedTotal += payload.skipped ?? 0
        relinkedTotal += payload.relinked ?? 0
        setLastSyncedAt(new Date())

        // Refreshed every round so the numbers fill in while the season
        // history keeps arriving, instead of only at the very end.
        await queryClient.invalidateQueries({ queryKey: queryKeys.account(currentAccountId) })

        if (payload.seasonBackfill?.done !== false) break

        setStatus(
          `Recuperando el historial de la temporada… ${syncedTotal} partidas recuperadas hasta ahora.`,
        )
      }

      const relinkedNote = relinkedTotal ? `, ${relinkedTotal} recuperadas de cuentas compartidas` : ''
      setStatus(
        `Se sincronizaron ${syncedTotal} partidas nuevas (${skippedTotal} ya existían${relinkedNote}).`,
      )
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudieron sincronizar las partidas.')
    } finally {
      setIsCatchingUpSeason(false)
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
      rankHistory={rankHistory}
      lessons={lessons}
      behaviorFlags={behaviorFlags}
      ddragonVersion={ddragonVersion}
      timeRange={timeRange}
      isSyncing={syncMatchesMutation.isPending || isCatchingUpSeason}
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
    />
  )
}

export default App
