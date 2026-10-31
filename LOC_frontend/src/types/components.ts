import type { ReactNode } from 'react'
import type { AuthFlow } from './auth'
import type {
  AccountCard,
  AccountForm,
  AccountStatsSummary,
  ActivityDay,
  BehaviorFlag,
  ChampionPerformanceTip,
  GoalCreateInput,
  GoalItem,
  GoalPrefill,
  LaneEntry,
  LessonCard,
  MatchParticipantEntry,
  PoolEntry,
  PoolRecommendation,
  PoolRoleKey,
  PoolRoleProfile,
  PoolSlotKey,
  PoolView,
  RankSnapshotEntry,
  ReplacePoolEntryInput,
  RosterChampion,
  StreakInfo,
  TabKey,
  TimeRange,
} from './dashboard'
import type {
  DuoAccountCard,
  DuoCandidate,
  DuoDetail,
  DuoGoalInput,
  DuoListItem,
  DuoProfile,
  DuoProfileInput,
  DuoRequestsResponse,
  RankGoalProgress,
} from './social'

export type BottomSheetProps = {
  isOpen: boolean
  onClose: () => void
  ariaLabel: string
  children: ReactNode
}

export type LockedTabStateProps = {
  title: string
  body: string
  ctaLabel: string
  onCtaClick: () => void
}

export type LockGlyphProps = {
  className?: string
}

export type AuthCheckboxProps = {
  checked: boolean
  onToggle: () => void
  label: string
  variant?: 'terms'
}

export type WeeklyActivityCardProps = {
  activity: ActivityDay[]
}

export type OnboardingTourProps = {
  onClose: () => void
  onLoadMatches: () => void
}

export type DashboardHeaderProps = {
  userAccounts: AccountCard[]
  currentAccountId: string
  activeAccount?: AccountCard
  onSetCurrentAccountId: (id: string) => void
  onOpenAccountModal: () => void
  onDeleteAccount: (accountId: string) => void
  onSyncMatches: () => void
  isSyncing: boolean
  lastSyncedLabel: string
}

export type DashboardSidebarProps = {
  userDisplayName: string
  userDisplayEmail: string
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  onLogout: () => void
  userAccounts: AccountCard[]
  currentAccountId: string
  onSetCurrentAccountId: (id: string) => void
  onOpenAccountModal: () => void
  onReplayOnboarding: () => void
  navMeta: Record<TabKey, number>
  lockedTabs: TabKey[]
}

export type MobileTabBarProps = {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  lockedTabs: TabKey[]
}

export type NavigationItem = {
  key: TabKey
  label: string
  tour?: string
}

export type MobileNavigationItem = NavigationItem

export type TabGlyphProps = {
  tab: TabKey
  active: boolean
}

export type TooltipPosition = {
  x: number
  y: number
}

export type DashboardScreenProps = {
  isSignedIn: boolean
  userDisplayName: string
  userDisplayEmail: string
  activeTab: TabKey
  userAccounts: AccountCard[]
  currentAccountId: string
  activeAccount?: AccountCard
  goalsByAccount: GoalItem[]
  status: string
  isLoadingDashboard: boolean
  accountForm: AccountForm
  matches: MatchParticipantEntry[]
  hasOlderMatches: boolean
  historyWindowDays: number | null
  statsSummary: AccountStatsSummary | null
  // The home's summary for the selected period (see timeRange).
  homeStatsSummary: AccountStatsSummary | null
  streak: StreakInfo | null
  lanes: LaneEntry[]
  weeklyActivity: ActivityDay[]
  rankHistory: RankSnapshotEntry[]
  lessons: LessonCard[]
  behaviorFlags: BehaviorFlag[]
  ddragonVersion: string | null
  timeRange: TimeRange
  isSyncing: boolean
  lastSyncedLabel: string
  championRoster: RosterChampion[]
  poolView: PoolView | undefined
  poolRecommendation: PoolRecommendation | undefined
  isPoolRecommendationLoading: boolean
  isSavingPool: boolean
  onSavePool: (entries: ReplacePoolEntryInput[]) => Promise<boolean>
  onAddPoolOutsider: (championKey: string, role: PoolSlotKey) => void
  // undefined while lookup is pending, null before onboarding, string after completion.
  onboardingCompletedAt: string | null | undefined
  onCompleteOnboarding: () => void
  onTimeRangeChange: (range: TimeRange) => void
  onTabChange: (tab: TabKey) => void
  onLogout: () => void
  onSetCurrentAccountId: (id: string) => void
  onAccountFieldChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onCreateAccount: (event: React.SubmitEvent<HTMLFormElement>) => void
  onDeleteAccount: (accountId: string) => void
  onSyncMatches: () => void
  onCreateGoal: (input: GoalCreateInput) => Promise<boolean>
  onDeleteGoal: (goalId: string) => void
}

export type RoleMetricsInfoModalProps = {
  isOpen: boolean
  onClose: () => void
}

export type LessonMediaArtProps = {
  mediaType: LessonCard['mediaType']
  kind?: LessonCard['kind']
  championKey?: string
  ddragonVersion: string | null
  label: string
}

export type LessonDetailViewProps = {
  lesson: LessonCard
  lessonNumber: number
  totalLessons: number
  accountId: string
  ddragonVersion: string | null
  overallStats: AccountStatsSummary | null
  onBack: () => void
  onPrevious: () => void
  onNext: () => void
  hasPrevious: boolean
  hasNext: boolean
}

export type ObjectivesPreviewCardProps = {
  goals: GoalItem[]
  onGoToGoals: () => void
  onOpenGoalModal: () => void
}

export type GoalRowProps = {
  goal: GoalItem
  onClick: () => void
  onDelete?: (event: React.MouseEvent) => void
}

export type GoalsTabPanelProps = {
  goalsByAccount: GoalItem[]
  behaviorFlagsCount: number
  hasPool: boolean
  onOpenGoalModal: () => void
  onDeleteGoal: (goalId: string) => void
  onGoToMatches: () => void
  onGoToLearning: () => void
  onGoToPoolChamp: () => void
}

export type FirstStepsChecklistProps = {
  completed: boolean[]
  variant?: 'floating' | 'inline'
}

export type LearningTabPanelProps = {
  activeAccount?: AccountCard
  lessons: LessonCard[]
  behaviorFlags: BehaviorFlag[]
  gamesAnalyzed: number
  ddragonVersion: string | null
  overallStats: AccountStatsSummary | null
  selectedIndex: number | null
  onSelectIndex: (index: number | null) => void
  hasPool: boolean
  poolView: PoolView | undefined
  championRoster: RosterChampion[]
  onGoToPoolChamp: () => void
  onCreateGoalFromFlag: (prefill: GoalPrefill) => void
}

export type DetectedErrorsSectionProps = {
  flags: BehaviorFlag[]
  ddragonVersion: string | null
  onCreateGoal: (flag: BehaviorFlag) => GoalPrefill
  onOpenGoalModal: (prefill: GoalPrefill) => void
}

export type LearningPreviewCardProps = {
  lessons: LessonCard[]
  gamesAnalyzed: number
  onOpenLesson: (index: number) => void
  onGoToLearning: () => void
}

export type PoolBoardProps = {
  poolView: PoolView
  ddragonVersion: string | null
  // poolEntryKey(champion, role) values for champions with an open lesson.
  championsWithOpenLesson: Set<string>
  onOpenLesson: (championKey: string, role: PoolSlotKey) => void
  onEditPool: () => void
  onAddOutsider: (championKey: string, role: PoolSlotKey) => void
}

export type PerformanceTipProps = {
  performance: ChampionPerformanceTip
  onAddSubstitute: (championKey: string) => void
}

export type PoolChampMiniCardProps = {
  entries: PoolEntry[]
  mainRole: PoolRoleKey | undefined
  ddragonVersion: string | null
  onGoToPoolChamp: () => void
}

export type MatchesTabPanelProps = {
  activeAccount?: AccountCard
  matches: MatchParticipantEntry[]
  hasOlderMatches: boolean
  historyWindowDays: number | null
  rankHistory: RankSnapshotEntry[]
  ddragonVersion: string | null
}

export type QueueFilter = 'all' | 420 | 440

export type PoolChampPromoCardProps = {
  roster: RosterChampion[]
  ddragonVersion: string | null
  onArmarPool: () => void
  onVerDelCoach: () => void
}

export type MatchRowProps = {
  entry: MatchParticipantEntry
  ddragonVersion: string | null
  showAgo?: boolean
}

export type PoolChampTabPanelProps = {
  activeAccount?: AccountCard
  poolView: PoolView | undefined
  roster: RosterChampion[]
  ddragonVersion: string | null
  lessons: LessonCard[]
  recommendation: PoolRecommendation | undefined
  isRecommendationLoading: boolean
  isSavingPool: boolean
  onSavePool: (entries: ReplacePoolEntryInput[]) => Promise<boolean>
  onAddOutsider: (championKey: string, role: PoolSlotKey) => void
  onOpenChampionLesson: (championKey: string, role: PoolSlotKey) => void
  onGoToAccounts: () => void
}

export type SlotValue = {
  championKey: string
  state: 'main' | 'secondary' | 'testing'
  note?: string
  addedBy: 'player' | 'coach'
}

export type SlotMap = Record<PoolSlotKey, SlotValue[]>
export type RoleStatus = 'empty' | 'incomplete' | 'valid'

export type SuggestedChampion = {
  champion: RosterChampion
  ribbon: 'CUBRE HUECO' | 'TU ESTILO' | 'LECCIÓN ABIERTA' | null
}

export type PoolSelectorProps = {
  roster: RosterChampion[]
  ddragonVersion: string | null
  initialEntries: PoolEntry[]
  roleProfile: PoolRoleProfile
  playedChampionKeys: Set<string>
  // poolEntryKey(champion, role) values for champions with an open lesson.
  championsWithOpenLesson: Set<string>
  recommendation: PoolRecommendation | undefined
  isRecommendationLoading: boolean
  isSaving: boolean
  onSave: (entries: ReplacePoolEntryInput[]) => Promise<boolean>
  onCancel: () => void
}

export type AccountBandProps = {
  account: AccountCard
  primaryQueue: 'solo' | 'flex'
  statsSummary: AccountStatsSummary | null
  streak: StreakInfo | null
  lanes: LaneEntry[]
}

export type AccountSearchModalProps = {
  isOpen: boolean
  accountForm: AccountForm
  status: string
  onClose: () => void
  onAccountFieldChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onCreateAccount: (event: React.SubmitEvent<HTMLFormElement>) => void
}

export type AccountsGridProps = {
  userAccounts: AccountCard[]
  currentAccountId: string
  ddragonVersion: string | null
  onSetCurrentAccountId: (id: string) => void
  onDeleteAccount: (accountId: string) => void
}

export type AccountTabPanelProps = {
  userAccounts: AccountCard[]
  activeAccount?: AccountCard
  currentAccountId: string
  ddragonVersion: string | null
  statsSummary: AccountStatsSummary | null
  homeStatsSummary: AccountStatsSummary | null
  streak: StreakInfo | null
  lanes: LaneEntry[]
  rankHistory: RankSnapshotEntry[]
  weeklyActivity: ActivityDay[]
  goalsByAccount: GoalItem[]
  lessons: LessonCard[]
  timeRange: TimeRange
  checklistCompleted: boolean[]
  championRoster: RosterChampion[]
  hasChampionPool: boolean
  poolView: PoolView | undefined
  onTimeRangeChange: (range: TimeRange) => void
  onSetCurrentAccountId: (id: string) => void
  onDeleteAccount: (accountId: string) => void
  onGoToGoals: () => void
  onGoToLearning: () => void
  onGoToPoolChamp: () => void
  onOpenGoalModal: () => void
  onOpenLesson: (index: number) => void
}

export type FeedbackModalProps = {
  isOpen: boolean
  onClose: () => void
}

export type GoalFormModalProps = {
  isOpen: boolean
  accountId: string
  status: string
  prefill: GoalPrefill | null
  onClose: () => void
  onSubmit: (input: GoalCreateInput) => Promise<boolean>
}

export type AuthStepProps = {
  flow: AuthFlow
}

export type AuthStatusProps = {
  status: string
}

export type LocMarkProps = {
  size: number
  weight?: 'regular' | 'bold'
  className?: string
}

// ─── Social ───────────────────────────────────────────────────────────────

export type SocialTabPanelProps = {
  userAccounts: AccountCard[]
  activeAccount?: AccountCard
  ddragonVersion: string | null
}

export type DuoAccountChipProps = {
  account: DuoAccountCard
  ddragonVersion: string | null
}

export type DiscordLinkCardProps = {
  discordUsername: string | null
}

export type DuoProfileFormProps = {
  profile: DuoProfile | null
  userAccounts: AccountCard[]
  defaultAccountId: string | undefined
  isSaving: boolean
  onSave: (input: DuoProfileInput) => void
}

export type RolePickerProps = {
  label: string
  selected: string[]
  onToggle: (role: string) => void
}

export type DuoCandidateListProps = {
  candidates: DuoCandidate[]
  ddragonVersion: string | null
  isLoading: boolean
  sendingTo: string | null
  onSendRequest: (toUserId: string, message: string) => void
}

export type DuoRequestListProps = {
  requests: DuoRequestsResponse
  ddragonVersion: string | null
  onRespond: (requestId: string, action: 'accept' | 'decline' | 'cancel') => void
}

export type DuoListProps = {
  duos: DuoListItem[]
  ddragonVersion: string | null
  onOpen: (duoId: string) => void
}

export type DuoDetailViewProps = {
  duoId: string
  ddragonVersion: string | null
  onBack: () => void
  onStatus: (message: string) => void
}

export type DuoGoalCardProps = {
  detail: DuoDetail
  isSaving: boolean
  onSave: (input: DuoGoalInput) => void
  onRemove: () => void
}

export type DuoGoalProgressLineProps = {
  label: string
  progress: RankGoalProgress
}

export type DuoChatProps = {
  duoId: string
  isEnded: boolean
  partnerName: string
}
