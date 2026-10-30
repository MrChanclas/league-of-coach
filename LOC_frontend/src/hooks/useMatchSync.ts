import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MAX_SYNC_ROUNDS, queryKeys } from '../constants'
import { formatLastSyncedLabel } from '../lib/hexforge'
import { useSyncMatchesMutation } from './useApiMutations'

/**
 * Syncs an account's matches, re-calling the endpoint while the season
 * backfill still has history left (see MAX_SYNC_ROUNDS).
 */
export function useMatchSync(accountId: string, setStatus: (message: string) => void) {
  const queryClient = useQueryClient()
  const syncMatchesMutation = useSyncMatchesMutation()
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  // True while the season backfill keeps re-calling sync in the background;
  // the mutation itself is idle between rounds, so the button would
  // otherwise flicker back to «Sincronizar ahora» mid-catch-up.
  const [isCatchingUpSeason, setIsCatchingUpSeason] = useState(false)

  const syncMatches = async () => {
    if (!accountId) return

    let syncedTotal = 0
    let skippedTotal = 0
    let relinkedTotal = 0

    try {
      setIsCatchingUpSeason(true)

      for (let round = 0; round < MAX_SYNC_ROUNDS; round += 1) {
        const payload = await syncMatchesMutation.mutateAsync(accountId)
        syncedTotal += payload.synced ?? 0
        skippedTotal += payload.skipped ?? 0
        relinkedTotal += payload.relinked ?? 0
        setLastSyncedAt(new Date())

        // Refreshed every round so the numbers fill in while the season
        // history keeps arriving, instead of only at the very end.
        await queryClient.invalidateQueries({ queryKey: queryKeys.account(accountId) })

        if (payload.seasonBackfill?.done !== false) break

        setStatus(`Recuperando el historial de la temporada… ${syncedTotal} partidas recuperadas hasta ahora.`)
      }

      const relinkedNote = relinkedTotal ? `, ${relinkedTotal} recuperadas de cuentas compartidas` : ''
      setStatus(`Se sincronizaron ${syncedTotal} partidas nuevas (${skippedTotal} ya existían${relinkedNote}).`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudieron sincronizar las partidas.')
    } finally {
      setIsCatchingUpSeason(false)
    }
  }

  return {
    syncMatches,
    isSyncing: syncMatchesMutation.isPending || isCatchingUpSeason,
    // Not memoized: it depends on the current time, not just `lastSyncedAt`,
    // so memoizing it would freeze the wording at whatever it was right after
    // the sync instead of it staying accurate as time passes.
    lastSyncedLabel: formatLastSyncedLabel(lastSyncedAt),
  }
}
