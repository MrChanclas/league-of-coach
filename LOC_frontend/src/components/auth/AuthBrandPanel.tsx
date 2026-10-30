import { APP_VERSION, CLAIMS, STATIC_PROOF } from '../../constants'
import { usePlatformStats } from '../../hooks/useApiQueries'

export function AuthBrandPanel() {
  const platformStatsQuery = usePlatformStats()
  const totalAccountsAnalyzed = platformStatsQuery.data?.totalAccountsAnalyzed ?? null

  const proof = [
    {
      big: totalAccountsAnalyzed !== null ? String(totalAccountsAnalyzed) : '—',
      label: 'CUENTAS DE RIOT ANALIZADAS',
    },
    ...STATIC_PROOF,
  ]

  return (
    <section className="auth-brand-panel">
      <img className="auth-brand-challenger-emblem" src="/assets/rank-emblem.png" alt="" />

      <div className="auth-brand-logo">
        <img className="auth-brand-mark" src="/loc-mark.svg" alt="" />
        <div>
          <div className="auth-brand-eyebrow">LEAGUE OF COACHING</div>
          <div className="auth-brand-wordmark">LoC</div>
        </div>
      </div>

      <div className="auth-brand-pitch">
        <div className="auth-brand-pitch-eyebrow">TEMPORADA 15 · SPLIT 3</div>
        <h1>Deja de adivinar por qué pierdes.</h1>
        <p>
          Vincula tus cuentas una vez. League of Coaching analiza cada partida y te devuelve tres cosas
          concretas para arreglar esta semana.
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
          <span>ALPHA {APP_VERSION} · SINCRONIZACIÓN AUTOMÁTICA</span>
        </div>
      </div>
    </section>
  )
}
