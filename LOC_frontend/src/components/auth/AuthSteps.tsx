import { PASSWORD_STRENGTH_BARS } from '../../constants'
import { getPasswordStrength } from '../../lib/auth'
import { AuthCheckbox, ClerkBadge, DiscordIcon, GoogleIcon, OrDivider } from './AuthPrimitives'
import type { AuthStatusProps, AuthStepProps } from '../../types/components'

function AuthStatus({ status }: AuthStatusProps) {
  return status ? <p className="auth-status">{status}</p> : null
}

function BackToLoginLink({ flow }: AuthStepProps) {
  return (
    <button type="button" className="auth-back-link" onClick={flow.handleGoBackToForm}>
      Volver a inicio de sesión
    </button>
  )
}

export function AuthLoadingStep() {
  return (
    <div className="auth-step">
      <p className="dashboard-status">Cargando…</p>
    </div>
  )
}

export function ForgotRequestStep({ flow }: AuthStepProps) {
  return (
    <div className="auth-step">
      <div className="auth-step-eyebrow">RECUPERAR ACCESO</div>
      <h2>Recupera tu contraseña</h2>
      <p className="auth-step-sub">Te enviamos un código a tu correo para elegir una nueva.</p>

      <form className="auth-fields auth-fields--spaced" onSubmit={flow.handleForgotRequestSubmit}>
        <label className="auth-field">
          <span className="auth-field-label">CORREO</span>
          <input
            className="auth-input"
            name="resetEmail"
            type="email"
            value={flow.resetEmail}
            onChange={(event) => flow.setResetEmail(event.target.value)}
            placeholder="jugador@correo.com"
            required
          />
        </label>

        <button type="submit" className="auth-submit" disabled={flow.isSubmitting}>
          {flow.isSubmitting ? 'Enviando...' : 'Enviar código'}
        </button>
      </form>

      <BackToLoginLink flow={flow} />
      <AuthStatus status={flow.status} />
    </div>
  )
}

export function ForgotResetStep({ flow }: AuthStepProps) {
  return (
    <div className="auth-step">
      <div className="auth-step-eyebrow">RECUPERAR ACCESO</div>
      <h2>Restablece tu contraseña</h2>
      <p className="auth-step-sub">Ingresa el código que te enviamos y tu nueva contraseña.</p>

      <form className="auth-fields auth-fields--spaced" onSubmit={flow.handleForgotResetSubmit}>
        <label className="auth-field">
          <span className="auth-field-label">CÓDIGO DE VERIFICACIÓN</span>
          <input
            className="auth-input"
            name="resetCode"
            value={flow.resetCode}
            onChange={(event) => flow.setResetCode(event.target.value)}
            placeholder="123456"
            required
          />
        </label>

        <label className="auth-field">
          <span className="auth-field-label">NUEVA CONTRASEÑA</span>
          <input
            className="auth-input auth-input--password"
            name="newPassword"
            type="password"
            value={flow.newPassword}
            onChange={(event) => flow.setNewPassword(event.target.value)}
            placeholder="Tu contraseña"
            minLength={8}
            required
          />
        </label>

        <button type="submit" className="auth-submit" disabled={flow.isSubmitting}>
          {flow.isSubmitting ? 'Restableciendo...' : 'Restablecer contraseña'}
        </button>
      </form>

      <BackToLoginLink flow={flow} />
      <AuthStatus status={flow.status} />
    </div>
  )
}

export function VerifyEmailStep({ flow }: AuthStepProps) {
  return (
    <div className="auth-step">
      <div className="auth-step-eyebrow">VERIFICA TU CORREO</div>
      <h2>Ingresa el código</h2>
      <p className="auth-step-sub">Te enviamos un código de 6 dígitos a tu correo.</p>

      <form className="auth-fields auth-fields--spaced" onSubmit={flow.handleVerify}>
        <label className="auth-field">
          <span className="auth-field-label">CÓDIGO DE VERIFICACIÓN</span>
          <input
            className="auth-input auth-input--code"
            name="code"
            value={flow.code}
            onChange={(event) => flow.setCode(event.target.value)}
            placeholder="123456"
            required
          />
        </label>

        <button type="submit" className="auth-submit" disabled={flow.isSubmitting}>
          {flow.isSubmitting ? 'Verificando...' : 'Verificar código'}
        </button>
      </form>

      <AuthStatus status={flow.status} />
    </div>
  )
}

export function LoginStep({ flow }: AuthStepProps) {
  return (
    <div className="auth-step">
      <div className="auth-step-eyebrow">BIENVENIDO DE VUELTA</div>
      <h2>Entra a tu panel</h2>
      <p className="auth-step-sub">Tus cuentas y el análisis del split te esperan donde los dejaste.</p>

      <div className="auth-socials">
        <button type="button" className="auth-social-btn" onClick={flow.handleGoogleAuth}>
          <GoogleIcon />
          <span className="auth-social-label">Continuar con Google</span>
        </button>
        <button type="button" className="auth-social-btn" onClick={flow.handleDiscordAuth}>
          <DiscordIcon />
          <span className="auth-social-label">Continuar con Discord</span>
        </button>
      </div>

      <OrDivider />

      <form className="auth-fields" onSubmit={flow.handleSubmit}>
        <label className="auth-field">
          <span className="auth-field-label">CORREO</span>
          <input
            className="auth-input"
            name="email"
            type="email"
            value={flow.form.email}
            onChange={flow.handleFieldChange}
            placeholder="jugador@correo.com"
            required
          />
        </label>

        <label className="auth-field">
          <div className="auth-field-label-row">
            <span className="auth-field-label">CONTRASEÑA</span>
            <button type="button" className="auth-field-link auth-field-link--button" onClick={flow.openForgotPassword}>
              ¿La olvidaste?
            </button>
          </div>
          <input
            className="auth-input auth-input--password"
            name="password"
            type="password"
            value={flow.form.password}
            onChange={flow.handleFieldChange}
            placeholder="Tu contraseña"
            required
          />
        </label>

        <button type="submit" className="auth-submit" disabled={flow.isSubmitting}>
          {flow.isSubmitting ? 'Procesando...' : 'Entrar'}
        </button>
      </form>

      <div className="auth-footnote">
        <ClerkBadge />
      </div>

      <AuthStatus status={flow.status} />
    </div>
  )
}

export function RegisterStep({ flow }: AuthStepProps) {
  const strength = getPasswordStrength(flow.form.password)

  return (
    <div className="auth-step">
      <div className="auth-step-eyebrow">EMPECEMOS</div>
      <h2>Crea tu cuenta</h2>
      <p className="auth-step-sub">Vincula tu cuenta de Riot una vez que inicies sesión, cuando quieras.</p>

      <form className="auth-fields auth-fields--spaced" onSubmit={flow.handleSubmit}>
        <label className="auth-field">
          <span className="auth-field-label">CÓMO TE LLAMAMOS</span>
          <input
            className="auth-input"
            name="name"
            value={flow.form.name}
            onChange={flow.handleFieldChange}
            placeholder="Tu nombre o apodo"
            required
          />
        </label>

        <label className="auth-field">
          <span className="auth-field-label">CORREO</span>
          <input
            className="auth-input"
            name="email"
            type="email"
            value={flow.form.email}
            onChange={flow.handleFieldChange}
            placeholder="jugador@correo.com"
            required
          />
        </label>

        <div className="auth-field">
          <span className="auth-field-label">CONTRASEÑA</span>
          <input
            className="auth-input auth-input--password"
            name="password"
            type="password"
            value={flow.form.password}
            onChange={flow.handleFieldChange}
            placeholder="Mínimo 10 caracteres"
            minLength={10}
            required
          />
          <div className="auth-strength">
            <div className="auth-strength-bars">
              {Array.from({ length: PASSWORD_STRENGTH_BARS }, (_, index) => (
                <div
                  key={index}
                  className="auth-strength-bar"
                  style={index < strength.filled ? { background: strength.color } : undefined}
                />
              ))}
            </div>
            <span className="auth-strength-label" style={{ color: strength.color }}>
              {strength.label}
            </span>
          </div>
        </div>

        <AuthCheckbox
          checked={flow.terms}
          onToggle={flow.toggleTerms}
          variant="terms"
          label="Acepto los Términos y la Política de privacidad, y el uso de mis datos de partida para generar el análisis."
        />

        <button type="submit" className="auth-submit" disabled={flow.isSubmitting || !flow.terms}>
          {flow.isSubmitting ? 'Procesando...' : 'Crear cuenta'}
        </button>
      </form>

      <div className="auth-footnote">
        <span className="auth-footnote-text">
          ¿Ya tienes cuenta?{' '}
          <button type="button" className="auth-footnote-link" onClick={() => flow.handleModeChange('login')}>
            Entra aquí
          </button>
        </span>
        <ClerkBadge />
      </div>

      <AuthStatus status={flow.status} />
    </div>
  )
}
