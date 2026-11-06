import type { SocialStanding } from '../../types/social'

const DATE = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' })

const SEVERITY_LABELS = { leve: 'Leve', moderado: 'Moderado', grave: 'Grave' } as const

/** Tells the user which strikes they have, why, and when each stops counting. */
export function StrikeNotice({ standing }: { standing: SocialStanding }) {
  return (
    <section className={`strike-notice${standing.banned ? ' strike-notice--banned' : ''}`} role="status">
      <h2>
        {standing.banned && standing.bannedUntil
          ? `No puedes usar Social hasta el ${DATE.format(new Date(standing.bannedUntil))}`
          : `Tienes ${standing.activePoints} ${standing.activePoints === 1 ? 'strike vigente' : 'strikes vigentes'}`}
      </h2>
      <p>
        Revisamos los reportes de tus duos. Con 3 strikes vigentes no puedes usar Social; cada strike deja de contar a
        los 90 días.
      </p>
      <ul>
        {standing.strikes.map((strike) => (
          <li key={strike.id}>
            <strong>
              {SEVERITY_LABELS[strike.severity]} ({strike.points})
            </strong>{' '}
            · {strike.reason} · vence el {DATE.format(new Date(strike.expiresAt))}
          </li>
        ))}
      </ul>
    </section>
  )
}
