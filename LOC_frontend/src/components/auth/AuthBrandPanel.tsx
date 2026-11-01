import { APP_VERSION, CLAIMS, MIN_ACCOUNTS_TO_SHOW, STATIC_PROOF } from '../../constants'
import { usePlatformStats } from '../../hooks/useApiQueries'
import { useMediaQuery } from '../../hooks/useMediaQuery'

export function AuthBrandPanel() {
  const platformStatsQuery = usePlatformStats()
  const totalAccountsAnalyzed = platformStatsQuery.data?.totalAccountsAnalyzed ?? null

  // The panel is hidden on smaller screens; without this the emblem, its
  // heaviest image, would still download there.
  const isPanelVisible = useMediaQuery('(min-width: 1025px)')

  const proof = [
    ...(totalAccountsAnalyzed !== null && totalAccountsAnalyzed >= MIN_ACCOUNTS_TO_SHOW
      ? [{ big: String(totalAccountsAnalyzed), label: 'CUENTAS DE RIOT ANALIZADAS' }]
      : []),
    ...STATIC_PROOF,
  ]

  return (
    <section className="auth-brand-panel">
      {isPanelVisible && <img className="auth-brand-challenger-emblem" src="/img/rank-emblem.webp" alt="" />}

      <div className="auth-brand-logo">
        <img className="auth-brand-mark" src="/loc-mark.svg" alt="" />
        <div>
          <div className="auth-brand-eyebrow">LEAGUE OF COACH</div>
          <div className="auth-brand-wordmark">LoC</div>
        </div>
      </div>

      <div className="auth-brand-pitch">
        <div className="auth-brand-pitch-eyebrow">COACHING PARA LEAGUE OF LEGENDS</div>
        <h1>Deja de adivinar por qué pierdes.</h1>
        <p>
          Vincula tus cuentas una vez. League of Coach analiza cada partida y te dice qué arreglar
          primero.
        </p>
        <div className="auth-brand-claims">
          {CLAIMS.map((claim) => (
            <div key={claim} className="auth-brand-claim">
              <span className="auth-brand-claim-dot" />
              <span>{claim}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-brand-proof">
        {proof.map((item) => (
          <div key={item.label}>
            <div className="auth-brand-proof-value">{item.big}</div>
            <div className="auth-brand-proof-label">{item.label}</div>
          </div>
        ))}
        <div className="auth-brand-status">
          <span className="auth-brand-status-dot" />
          <span>{APP_VERSION.toUpperCase()} · SINCRONIZACIÓN AUTOMÁTICA</span>
        </div>
      </div>
    </section>
  )
}
