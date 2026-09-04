import { ActiveGoalCard } from './ActiveGoalCard'
import { AccountsGrid } from './AccountsGrid'
import { HeroCard } from './HeroCard'
import { MatchRow } from './MatchRow'
import { TopChampionsCard } from './TopChampionsCard'
import { WeeklyActivityCard } from './WeeklyActivityCard'
import { getProfileIconUrl } from '../lib/riotAssets'
import type {
  AccountCard,
  AccountStatsSummary,
  ActivityDay,
  ChampionSplitStat,
  GoalItem,
  LaneEntry,
  MasteryEntry,
  MatchParticipantEntry,
  RankSnapshotEntry,
  StreakInfo,
  TimeRange,
} from '../types/dashboard'

type AccountTabPanelProps = {
  userAccounts: AccountCard[]
  activeAccount?: AccountCard
  currentAccountId: string
  ddragonVersion: string | null
  statsSummary: AccountStatsSummary | null
  streak: StreakInfo | null
  lanes: LaneEntry[]
  rankHistory: RankSnapshotEntry[]
  weeklyActivity: ActivityDay[]
  championsSplit: ChampionSplitStat[]
  goalsByAccount: GoalItem[]
  matches: MatchParticipantEntry[]
  mastery: MasteryEntry[]
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
  onSetCurrentAccountId: (id: string) => void
  onDeleteAccount: (accountId: string) => void
  onGoToMatches: () => void
  onGoToGoals: () => void
}

export function AccountTabPanel({
  userAccounts,
  activeAccount,
  currentAccountId,
  ddragonVersion,
  statsSummary,
  streak,
  lanes,
  rankHistory,
  weeklyActivity,
  championsSplit,
  goalsByAccount,
  matches,
  mastery,
  timeRange,
  onTimeRangeChange,
  onSetCurrentAccountId,
  onDeleteAccount,
  onGoToMatches,
  onGoToGoals,
}: AccountTabPanelProps) {
  if (!activeAccount) {
    return (
      <div className="view-content">
        <div className="page-head">
          <div>
            <div className="page-head-eyebrow">BIENVENIDO</div>
            <h1>Vincula tu primera cuenta de Riot</h1>
            <p>Usa &quot;+ Vincular cuenta Riot&quot; en la barra lateral para empezar a ver tus estadísticas.</p>
          </div>
        </div>
        <AccountsGrid
          userAccounts={userAccounts}
          currentAccountId={currentAccountId}
          ddragonVersion={ddragonVersion}
          onSetCurrentAccountId={onSetCurrentAccountId}
          onDeleteAccount={onDeleteAccount}
        />
      </div>
    )
  }

  const primaryQueue: 'solo' | 'flex' = activeAccount.soloTier !== 'Unranked' ? 'solo' : 'flex'
  const profileIconUrl =
    ddragonVersion && activeAccount.profileIconId > 0
      ? getProfileIconUrl(activeAccount.profileIconId, ddragonVersion)
      : null
  const masteryTotalPoints = mastery.reduce((sum, entry) => sum + entry.championPoints, 0)

  const sortedHistory = [...rankHistory].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
  )
  const netLp =
    sortedHistory.length >= 2 ? sortedHistory[sortedHistory.length - 1].lp - sortedHistory[0].lp : null

  const heroTitle = netLp !== null && netLp < 0 ? 'Tu semana en revisión' : 'Tu progreso semanal'
  const insight =
    statsSummary && statsSummary.gamesPlayed > 0
      ? `Llevas ${statsSummary.gamesPlayed} partidas con ${Math.round(statsSummary.winrate * 100)}% de winrate` +
        (netLp !== null ? ` y ${netLp >= 0 ? '+' : ''}${netLp} LP en el período.` : '.')
      : 'Sincroniza tus partidas para ver un resumen de tu progreso.'

  const activeGoal = goalsByAccount.find((goal) => goal.status === 'in_progress') ?? null
  const recentMatches = matches.slice(0, 4)

  return (
    <div className="view-content">
      <div className="cuentas-view">
        <div className="cuentas-main">
          <div className="page-head">
            <div>
              <div className="page-head-eyebrow">BIENVENIDO DE VUELTA</div>
              <h1>{heroTitle}</h1>
              <p>{insight}</p>
            </div>
            <div className="time-toggle">
              <button
                type="button"
                className={timeRange === '7d' ? 'time-toggle-btn active' : 'time-toggle-btn'}
                onClick={() => onTimeRangeChange('7d')}
              >
                7 días
              </button>
              <button
                type="button"
                className={timeRange === 'split' ? 'time-toggle-btn active' : 'time-toggle-btn'}
                onClick={() => onTimeRangeChange('split')}
              >
                Split
              </button>
            </div>
          </div>

          <HeroCard
            account={activeAccount}
            profileIconUrl={profileIconUrl}
            primaryQueue={primaryQueue}
            statsSummary={statsSummary}
            streak={streak}
            lanes={lanes}
            masteryTotalPoints={masteryTotalPoints}
          />

          <AccountsGrid
            userAccounts={userAccounts}
            currentAccountId={currentAccountId}
            ddragonVersion={ddragonVersion}
            onSetCurrentAccountId={onSetCurrentAccountId}
            onDeleteAccount={onDeleteAccount}
          />

          <section className="matches-panel">
            <div className="matches-panel-head">
              <h2>ÚLTIMAS PARTIDAS</h2>
              <button type="button" className="matches-panel-head-link" onClick={onGoToMatches}>
                Ver todas →
              </button>
            </div>
            {recentMatches.length === 0 ? (
              <p className="matches-empty">Todavía no hay partidas sincronizadas para esta cuenta.</p>
            ) : (
              recentMatches.map((entry) => (
                <MatchRow key={entry.id} entry={entry} ddragonVersion={ddragonVersion} />
              ))
            )}
          </section>
        </div>

        <aside className="cuentas-aside">
          <WeeklyActivityCard activity={weeklyActivity} />
          <TopChampionsCard champions={championsSplit} ddragonVersion={ddragonVersion} />
          <ActiveGoalCard goal={activeGoal} onGoToGoals={onGoToGoals} />
        </aside>
      </div>
    </div>
  )
}
