import { useState } from 'react'
import { useAuthFlow } from '../../hooks/useAuthFlow'
import { FeedbackModal } from '../feedback/FeedbackModal'
import { AuthBrandPanel } from './AuthBrandPanel'
import {
  AuthLoadingStep,
  ForgotRequestStep,
  ForgotResetStep,
  LoginStep,
  RegisterStep,
  VerifyEmailStep,
} from './AuthSteps'
import type { AuthStepProps } from '../../types/components'

function AuthStepContent({ flow }: AuthStepProps) {
  if (!flow.isUserLoaded) return <AuthLoadingStep />
  if (flow.authView === 'forgot-request') return <ForgotRequestStep flow={flow} />
  if (flow.authView === 'forgot-reset') return <ForgotResetStep flow={flow} />
  if (flow.pendingVerification) return <VerifyEmailStep flow={flow} />
  if (flow.authMode === 'login') return <LoginStep flow={flow} />
  return <RegisterStep flow={flow} />
}

export function CuentaTabPanel() {
  const flow = useAuthFlow()
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const showTabs = flow.isUserLoaded && flow.authView === 'form' && !flow.pendingVerification

  return (
    <div className="auth-shell">
      <AuthBrandPanel />

      <section className="auth-form-panel">
        <div className="auth-mobile-brand">
          <img className="auth-mobile-brand-mark" src="/loc-mark.svg" alt="" />
          <div>
            <div className="auth-brand-eyebrow">LEAGUE OF COACHING</div>
            <div className="auth-mobile-brand-wordmark">LoC</div>
          </div>
        </div>

        <div className="auth-form-header">
          {showTabs ? (
            <div className="auth-tabs">
              <button
                type="button"
                className={flow.authMode === 'login' ? 'auth-tab-btn active' : 'auth-tab-btn'}
                onClick={() => flow.handleModeChange('login')}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                className={flow.authMode === 'register' ? 'auth-tab-btn active' : 'auth-tab-btn'}
                onClick={() => flow.handleModeChange('register')}
              >
                Crear cuenta
              </button>
            </div>
          ) : (
            <div />
          )}
          <div className="auth-locale">LAS · ESPAÑOL</div>
        </div>

        <AuthStepContent flow={flow} />

        <div className="auth-form-spacer" />
      </section>

      {/* Fijo en la esquina (no al pie del formulario) para que se vea sin hacer scroll. */}
      {!feedbackOpen && (
        <button type="button" className="feedback-fab" onClick={() => setFeedbackOpen(true)}>
          <span className="feedback-fab-icon" aria-hidden="true">💬</span>
          <span>¿Algo que mejorar? Danos tu feedback</span>
        </button>
      )}

      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  )
}
