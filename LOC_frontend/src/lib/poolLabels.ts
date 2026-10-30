import { FILL_SLOT, POOL_MIN_GAMES_FOR_WINRATE } from '../constants'
import type { PoolRoleKey, PoolRoleProfile, PoolSlotKey, PoolView } from '../types/dashboard'

// Mismas reglas que champion-pools/pool-roles.ts en el backend: el pool solo
// ofrece la línea principal, la secundaria y un slot FILL para todo lo demás.
export function getPoolSlots(profile: PoolRoleProfile | undefined): PoolSlotKey[] {
  const slots: PoolSlotKey[] = []
  if (profile?.primaryRole) slots.push(profile.primaryRole)
  if (profile?.secondaryRole) slots.push(profile.secondaryRole)
  slots.push(FILL_SLOT)
  return slots
}

export function resolvePoolSlot(role: string, profile: PoolRoleProfile | undefined): PoolSlotKey {
  return role === profile?.primaryRole || role === profile?.secondaryRole ? (role as PoolRoleKey) : FILL_SLOT
}

// Un campeón puede estar en más de una línea, así que una entrada del pool se
// identifica por campeón + línea.
export function poolEntryKey(championKey: string, slot: PoolSlotKey): string {
  return `${championKey}|${slot}`
}

export function getPoolSlotCaption(slot: PoolSlotKey, profile: PoolRoleProfile | undefined): string {
  if (slot === FILL_SLOT) return 'Campeones fuera de tus líneas main'
  return slot === profile?.primaryRole ? 'Línea principal' : 'Línea secundaria'
}

export function formatPoolWinrate(gamesPlayed: number, winrate: number) {
  if (gamesPlayed < POOL_MIN_GAMES_FOR_WINRATE) return { label: '—', className: 'pool-wr pool-wr--muted' }
  const pct = Math.round(winrate * 100)
  return { label: `${pct}%`, className: pct >= 50 ? 'pool-wr pool-wr--win' : 'pool-wr pool-wr--loss' }
}

export function formatPoolProvenance(pool: PoolView['pool']) {
  if (!pool) return ''
  const date = new Date(pool.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
  return pool.source === 'coach'
    ? `Armada con la recomendación del coach el ${date}`
    : `Armada a mano el ${date}`
}
