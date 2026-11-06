import type { AdminAccountSummary, StrikeSeverity } from '../../types/admin'

const DATE = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })
const DATE_TIME = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatDate = (value: string) => DATE.format(new Date(value))
export const formatDateTime = (value: string) => DATE_TIME.format(new Date(value))

export const SEVERITY_LABELS: Record<StrikeSeverity, string> = {
  leve: 'Leve',
  moderado: 'Moderado',
  grave: 'Grave',
}

export const SEVERITY_POINTS: Record<StrikeSeverity, number> = { leve: 1, moderado: 2, grave: 3 }

// Mirrors SOCIAL_BAN_POINTS in the backend's moderation.constants.ts.
export const SOCIAL_BAN_POINTS = 3

export function formatAccount(account: AdminAccountSummary) {
  const rank =
    account.soloTier && account.soloTier !== 'Unranked'
      ? `${account.soloTier} ${account.soloDivision} · ${account.soloLp} LP`
      : 'Sin rango'
  return `${account.summoner}#${account.tag} (${account.server}) · ${rank}`
}
