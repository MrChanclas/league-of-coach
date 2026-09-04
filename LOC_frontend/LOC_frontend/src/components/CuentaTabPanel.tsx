import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSignIn, useSignUp, useUser } from '@clerk/clerk-react'

type AuthMode = 'login' | 'register'
type AuthView = 'form' | 'forgot-request' | 'forgot-reset'

const APP_VERSION = __APP_VERSION__

const CLAIMS = [
  'Tres correcciones concretas por semana, no cien estadísticas sueltas.',
  'Objetivos con progreso medible hasta el final del split.',
  'Múltiples cuentas en un solo panel: smurf, flex y principal.',
]

const PROOF = [
  { big: '3', label: 'CUENTAS POR PERFIL' },
  { big: '20', label: 'PARTIDAS POR ANÁLISIS' },
  { big: '0$', label: 'DURANTE LA BETA' },
]

function getClerkErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'errors' in error) {
    const clerkError = error as { errors?: { message?: string; longMessage?: string }[] }
    return clerkError.errors?.[0]?.longMessage ?? clerkError.errors?.[0]?.message ?? fallback
  }
  return error instanceof Error ? error.message : fallback
}

function getPasswordStrength(password: string) {
  if (!password) return { filled: 0, label: 'DÉBIL', color: '#cd6a63' }

  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1

  const levels = [
    { filled: 1, label: 'DÉBIL', color: '#cd6a63' },
    { filled: 2, label: 'DÉBIL', color: '#cd6a63' },
    { filled: 3, label: 'MEDIA', color: '#e2c483' },
    { filled: 4, label: 'SÓLIDA', color: '#5fceac' },
  ]

  return levels[Math.min(score, levels.length - 1)]
}

function Checkbox({
  checked,
  onToggle,
  label,
  variant,
}: {
  checked: boolean
  onToggle: () => void
  label: string
  variant?: 'terms'
}) {
  return (
    <button
      type="button"
      className={variant === 'terms' ? 'auth-checkbox-row auth-checkbox-row--terms' : 'auth-checkbox-row'}
      onClick={onToggle}
    >
      <span className={checked ? 'auth-checkbox-box checked' : 'auth-checkbox-box'}>
        {checked && <span>✓</span>}
      </span>
      <span className={variant === 'terms' ? 'auth-checkbox-label auth-checkbox-label--terms' : 'auth-checkbox-label'}>
        {label}
      </span>
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg className="auth-social-mark" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

function OrDivider() {
  return (
    <div className="auth-oredivider">
      <span className="auth-oredivider-line" />
      <span>O CON TU CORREO</span>
      <span className="auth-oredivider-line" />
    </div>
  )
}

function ClerkBadge() {
  return (
    <span className="auth-clerk-badge">
      <span />
      <span>SEGURO CON CLERK</span>
    </span>
  )
}

export function CuentaTabPanel() {
  const { isLoaded: isUserLoaded } = useUser()
  const { signIn, setActive: setActiveSignIn, isLoaded: isSignInLoaded } = useSignIn()
  const { signUp, setActive: setActiveSignUp, isLoaded: isSignUpLoaded } = useSignUp()

  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authView, setAuthView] = useState<AuthView>('form')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [code, setCode] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [remember, setRemember] = useState(true)
  const [terms, setTerms] = useState(true)

  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const handleModeChange = (mode: AuthMode) => {
    setAuthMode(mode)
    setPendingVerification(false)
    setStatus('')
  }

  const handleGoBackToForm = () => {
    setAuthView('form')
    setStatus('')
  }

  const handleFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('')
    setIsSubmitting(true)

    try {
      if (authMode === 'login') {
        if (!isSignInLoaded) return

        const result = await signIn.create({
          identifier: form.email,
          password: form.password,
        })

        if (result.status === 'complete') {
          await setActiveSignIn({ session: result.createdSessionId })
          setStatus('Sesión iniciada correctamente.')
        } else {
          setStatus('No se pudo completar el inicio de sesión.')
        }
      } else {
        if (!isSignUpLoaded) return
        if (!terms) {
          setStatus('Tienes que aceptar los términos para continuar.')
          return
        }

        const result = await signUp.create({
          emailAddress: form.email,
          password: form.password,
          firstName: form.name,
        })

        if (result.status === 'complete') {
          await setActiveSignUp({ session: result.createdSessionId })
          setStatus('Cuenta creada correctamente.')
        } else {
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
          setPendingVerification(true)
          setStatus('Te enviamos un código de verificación a tu correo.')
        }
      }
    } catch (error) {
      setStatus(getClerkErrorMessage(error, 'Hubo un error al conectar con Clerk.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isSignUpLoaded) return

    setStatus('')
    setIsSubmitting(true)

    try {
      const result = await signUp.attemptEmailAddressVerification({ code })

      if (result.status === 'complete') {
        await setActiveSignUp({ session: result.createdSessionId })
        setStatus('Cuenta verificada correctamente.')
      } else {
        setStatus('El código no es válido, intenta nuevamente.')
      }
    } catch (error) {
      setStatus(getClerkErrorMessage(error, 'No se pudo verificar el código.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotRequestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isSignInLoaded) return

    setStatus('')
    setIsSubmitting(true)

    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: resetEmail })
      setAuthView('forgot-reset')
      setStatus('Te enviamos un código para restablecer tu contraseña.')
    } catch (error) {
      setStatus(getClerkErrorMessage(error, 'No se pudo enviar el código de recuperación.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isSignInLoaded) return

    setStatus('')
    setIsSubmitting(true)

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: resetCode,
        password: newPassword,
      })

      if (result.status === 'complete') {
        await setActiveSignIn({ session: result.createdSessionId })
        setStatus('Contraseña actualizada. Sesión iniciada.')
        setAuthView('form')
      } else {
        setStatus('El código no es válido, intenta nuevamente.')
      }
    } catch (error) {
      setStatus(getClerkErrorMessage(error, 'No se pudo restablecer la contraseña.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleAuth = async () => {
    if (!isSignInLoaded) return

    setStatus('')

    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: window.location.origin,
      })
    } catch (error) {
      setStatus(getClerkErrorMessage(error, 'No se pudo conectar con Google.'))
    }
  }

  const showTabs = isUserLoaded && authView === 'form' && !pendingVerification

  const renderStepContent = () => {
    if (!isUserLoaded) {
      return (
        <div className="auth-step">
          <p className="dashboard-status">Cargando…</p>
        </div>
      )
    }

    if (authView === 'forgot-request') {
      return (
        <div className="auth-step">
          <div className="auth-step-eyebrow">RECUPERAR ACCESO</div>
          <h2>Recuperá tu contraseña</h2>
          <p className="auth-step-sub">Te enviamos un código a tu correo para elegir una nueva.</p>

          <form className="auth-fields" style={{ marginTop: 26 }} onSubmit={handleForgotRequestSubmit}>
            <label className="auth-field">
              <span className="auth-field-label">CORREO</span>
              <input
                className="auth-input"
                name="resetEmail"
                type="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                placeholder="jugador@correo.com"
                required
              />
            </label>

            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar código'}
            </button>
          </form>

          <button type="button" className="auth-back-link" onClick={handleGoBackToForm}>
            Volver a inicio de sesión
          </button>

          {status && <p className="auth-status">{status}</p>}
        </div>
      )
    }

    if (authView === 'forgot-reset') {
      return (
        <div className="auth-step">
          <div className="auth-step-eyebrow">RECUPERAR ACCESO</div>
          <h2>Restablece tu contraseña</h2>
          <p className="auth-step-sub">Ingresa el código que te enviamos y tu nueva contraseña.</p>

          <form className="auth-fields" style={{ marginTop: 26 }} onSubmit={handleForgotResetSubmit}>
            <label className="auth-field">
              <span className="auth-field-label">CÓDIGO DE VERIFICACIÓN</span>
              <input
                className="auth-input"
                name="resetCode"
                value={resetCode}
                onChange={(event) => setResetCode(event.target.value)}
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
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="••••••••••••"
                minLength={8}
                required
              />
            </label>

            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Restableciendo...' : 'Restablecer contraseña'}
            </button>
          </form>

          <button type="button" className="auth-back-link" onClick={handleGoBackToForm}>
            Volver a inicio de sesión
          </button>

          {status && <p className="auth-status">{status}</p>}
        </div>
      )
    }

    if (pendingVerification) {
      return (
        <div className="auth-step">
          <div className="auth-step-eyebrow">VERIFICA TU CORREO</div>
          <h2>Ingresa el código</h2>
          <p className="auth-step-sub">Te enviamos un código de 6 dígitos a tu correo.</p>

          <form className="auth-fields" style={{ marginTop: 26 }} onSubmit={handleVerify}>
            <label className="auth-field">
              <span className="auth-field-label">CÓDIGO DE VERIFICACIÓN</span>
              <input
                className="auth-input"
                style={{ letterSpacing: '.3em', textAlign: 'center' }}
                name="code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
                required
              />
            </label>

            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Verificando...' : 'Verificar código'}
            </button>
          </form>

          {status && <p className="auth-status">{status}</p>}
        </div>
      )
    }

    if (authMode === 'login') {
      return (
        <div className="auth-step">
          <div className="auth-step-eyebrow">BIENVENIDO DE VUELTA</div>
          <h2>Entra a tu panel</h2>
          <p className="auth-step-sub">Tus cuentas y el análisis del split te esperan donde los dejaste.</p>

          <div className="auth-socials">
            <button type="button" className="auth-social-btn" onClick={handleGoogleAuth}>
              <GoogleIcon />
              <span className="auth-social-label">Continuar con Google</span>
            </button>
          </div>

          <OrDivider />

          <form className="auth-fields" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span className="auth-field-label">CORREO</span>
              <input
                className="auth-input"
                name="email"
                type="email"
                value={form.email}
                onChange={handleFieldChange}
                placeholder="jugador@correo.com"
                required
              />
            </label>

            <label className="auth-field">
              <div className="auth-field-label-row">
                <span className="auth-field-label">CONTRASEÑA</span>
                <button
                  type="button"
                  className="auth-field-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
                  onClick={() => setAuthView('forgot-request')}
                >
                  ¿La olvidaste?
                </button>
              </div>
              <input
                className="auth-input auth-input--password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleFieldChange}
                placeholder="••••••••••••"
                required
              />
            </label>

            <Checkbox
              checked={remember}
              onToggle={() => setRemember((previous) => !previous)}
              label="Mantener la sesión abierta en este equipo"
            />

            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Procesando...' : 'Entrar'}
            </button>
          </form>

          <div className="auth-footnote">
            <span className="auth-footnote-text">
              ¿Primera vez aquí?{' '}
              <button type="button" className="auth-footnote-link" onClick={() => handleModeChange('register')}>
                Crea tu cuenta gratis
              </button>
            </span>
            <ClerkBadge />
          </div>

          {status && <p className="auth-status">{status}</p>}
        </div>
      )
    }

    const strength = getPasswordStrength(form.password)

    return (
      <div className="auth-step">
        <div className="auth-step-eyebrow">EMPECEMOS</div>
        <h2>Crea tu cuenta</h2>
        <p className="auth-step-sub">Sin tarjeta. Vincula tu cuenta de Riot una vez que inicies sesión, cuando quieras.</p>

        <form className="auth-fields" style={{ marginTop: 26 }} onSubmit={handleSubmit}>
          <label className="auth-field">
            <span className="auth-field-label">CÓMO TE LLAMAMOS</span>
            <input
              className="auth-input"
              name="name"
              value={form.name}
              onChange={handleFieldChange}
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
              value={form.email}
              onChange={handleFieldChange}
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
              value={form.password}
              onChange={handleFieldChange}
              placeholder="Mínimo 10 caracteres"
              minLength={10}
              required
            />
            <div className="auth-strength">
              <div className="auth-strength-bars">
                {[0, 1, 2, 3].map((index) => (
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

          <Checkbox
            checked={terms}
            onToggle={() => setTerms((previous) => !previous)}
            variant="terms"
            label="Acepto los términos y el uso de mis datos de partida para generar el análisis. League of Coaching no es un producto oficial de Riot Games."
          />

          <button type="submit" className="auth-submit" disabled={isSubmitting || !terms}>
            {isSubmitting ? 'Procesando...' : 'Crear cuenta'}
          </button>
        </form>

        <div className="auth-footnote">
          <span className="auth-footnote-text">
            ¿Ya tienes cuenta?{' '}
            <button type="button" className="auth-footnote-link" onClick={() => handleModeChange('login')}>
              Entra aquí
            </button>
          </span>
          <ClerkBadge />
        </div>

        {status && <p className="auth-status">{status}</p>}
      </div>
    )
  }

  return (
    <div className="auth-shell">
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
          {PROOF.map((item) => (
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

      <section className="auth-form-panel">
        <div className="auth-form-header">
          {showTabs ? (
            <div className="auth-tabs">
              <button
                type="button"
                className={authMode === 'login' ? 'auth-tab-btn active' : 'auth-tab-btn'}
                onClick={() => handleModeChange('login')}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                className={authMode === 'register' ? 'auth-tab-btn active' : 'auth-tab-btn'}
                onClick={() => handleModeChange('register')}
              >
                Crear cuenta
              </button>
            </div>
          ) : (
            <div />
          )}
          <div className="auth-locale">LAS · ESPAÑOL</div>
        </div>

        {renderStepContent()}

        <div className="auth-form-spacer" />

        <div className="auth-legal-footer">
          <span>LEAGUE OF COACHING · NO AFILIADO A RIOT GAMES</span>
          <span className="auth-legal-links">
            <a href="#">Privacidad</a>
            <a href="#">Términos</a>
          </span>
        </div>
      </section>
    </div>
  )
}
