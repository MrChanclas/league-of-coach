import { useState } from 'react'
import { PoolBoard } from './PoolBoard'
import { PoolSelector } from './PoolSelector'
import type {
  AccountCard,
  LessonCard,
  PoolRecommendation,
  PoolView,
  ReplacePoolEntryInput,
  RosterChampion,
} from '../../types/dashboard'

type PoolChampTabPanelProps = {
  activeAccount?: AccountCard
  poolView: PoolView | undefined
  roster: RosterChampion[]
  ddragonVersion: string | null
  lessons: LessonCard[]
  recommendation: PoolRecommendation | undefined
  isRecommendationLoading: boolean
  isSavingPool: boolean
  onSavePool: (entries: ReplacePoolEntryInput[]) => Promise<boolean>
  onAddOutsider: (championKey: string) => void
  onOpenChampionLesson: (championKey: string) => void
  onGoToAccounts: () => void
}

export function PoolChampTabPanel({
  activeAccount,
  poolView,
  roster,
  ddragonVersion,
  lessons,
  recommendation,
  isRecommendationLoading,
  isSavingPool,
  onSavePool,
  onAddOutsider,
  onOpenChampionLesson,
  onGoToAccounts,
}: PoolChampTabPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [initializedForAccountId, setInitializedForAccountId] = useState<string | null>(null)

  // Defaults to the selector (6A) when the account has no pool yet, or the
  // board (5B) when it does — decided once per account as soon as the pool
  // finishes loading, without fighting the user's own toggling afterward.
  // Adjusted during render (not an effect) — same pattern App.tsx uses to
  // sync currentAccountId to the dashboard payload.
  if (poolView && activeAccount && initializedForAccountId !== activeAccount.id) {
    setInitializedForAccountId(activeAccount.id)
    setIsEditing(!poolView.pool)
  }

  if (!activeAccount) {
    return (
      <div className="view-content">
        <div className="page-head">
          <div>
            <h1>Pool Champ</h1>
            <p>Agrega una cuenta de Riot en la pestaña &quot;Cuentas&quot; para armar tu pool de campeones.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!poolView) {
    return (
      <div className="view-content">
        <p className="dashboard-status">Cargando tu pool…</p>
      </div>
    )
  }

  const championsWithOpenLesson = new Set(
    lessons.filter((lesson) => lesson.kind === 'champion' && lesson.championKey).map((lesson) => lesson.championKey!),
  )

  const playedChampionKeys = new Set([
    ...poolView.entries.filter((entry) => entry.gamesPlayed > 0).map((entry) => entry.championKey),
    ...poolView.outsiders.map((outsider) => outsider.championKey),
  ])

  if (isEditing) {
    return (
      <PoolSelector
        roster={roster}
        ddragonVersion={ddragonVersion}
        initialEntries={poolView.entries}
        playedChampionKeys={playedChampionKeys}
        championsWithOpenLesson={championsWithOpenLesson}
        recommendation={recommendation}
        isRecommendationLoading={isRecommendationLoading}
        isSaving={isSavingPool}
        onSave={async (entries) => {
          const success = await onSavePool(entries)
          if (success) setIsEditing(false)
          return success
        }}
        onCancel={() => (poolView.pool ? setIsEditing(false) : onGoToAccounts())}
      />
    )
  }

  return (
    <PoolBoard
      poolView={poolView}
      ddragonVersion={ddragonVersion}
      championsWithOpenLesson={championsWithOpenLesson}
      onOpenLesson={onOpenChampionLesson}
      onEditPool={() => setIsEditing(true)}
      onAddOutsider={onAddOutsider}
    />
  )
}
