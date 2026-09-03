import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSignIn, useSignUp, useUser } from '@clerk/clerk-react'

type AuthMode = 'login' | 'register'
type AuthView = 'form' | 'forgot-request' | 'forgot-reset'

function getClerkErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'errors' in error) {
    const clerkError = error as { errors?: { message?: string; longMessage?: string }[] }
    return clerkError.errors?.[0]?.longMessage ?? clerkError.errors?.[0]?.message ?? fallback
  }
  return error instanceof Error ? error.message : fallback
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

  if (!isUserLoaded) {
    return (
      <div className="cuenta-panel">
        <div className="auth-card">
          <p className="dashboard-status">Cargando…</p>
        </div>
      </div>
    )
  }

  if (authView === 'forgot-request') {
    return (
      <div className="cuenta-panel">
        <div className="auth-card">
          <div className="auth-brand">HEXFORGE</div>
          <div className="auth-header">
            <span className="eyebrow">League of Coach</span>
            <h1>Recupera tu contraseña</h1>
          </div>

          <form className="auth-form" onSubmit={handleForgotRequestSubmit}>
            <label>
              Email
              <input
                name="resetEmail"
                type="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                placeholder="tucorreo@ejemplo.com"
                required
              />
            </label>

            <button type="submit" className="primary-btn auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar código'}
            </button>
          </form>

          <button type="button" className="link-btn" onClick={handleGoBackToForm}>
            Volver a inicio de sesión
          </button>

          {status && <p className="auth-status">{status}</p>}
        </div>
      </div>
    )
  }

  if (authView === 'forgot-reset') {
    return (
      <div className="cuenta-panel">
        <div className="auth-card">
          <div className="auth-brand">HEXFORGE</div>
          <div className="auth-header">
            <span className="eyebrow">League of Coach</span>
            <h1>Restablece tu contraseña</h1>
          </div>

          <form className="auth-form" onSubmit={handleForgotResetSubmit}>
            <label>
              Código de verificación
              <input
                name="resetCode"
                value={resetCode}
                onChange={(event) => setResetCode(event.target.value)}
                placeholder="123456"
                required
              />
            </label>

            <label>
              Nueva contraseña
              <input
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </label>

            <button type="submit" className="primary-btn auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Restableciendo...' : 'Restablecer contraseña'}
            </button>
          </form>

          <button type="button" className="link-btn" onClick={handleGoBackToForm}>
            Volver a inicio de sesión
          </button>

          {status && <p className="auth-status">{status}</p>}
        </div>
      </div>
    )
  }

  if (pendingVerification) {
    return (
      <div className="cuenta-panel">
        <div className="auth-card">
          <div className="auth-brand">HEXFORGE</div>
          <div className="auth-header">
            <span className="eyebrow">League of Coach</span>
            <h1>Verifica tu correo</h1>
          </div>

          <form className="auth-form" onSubmit={handleVerify}>
            <label>
              Código de verificación
              <input
                name="code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
                required
              />
            </label>

            <button type="submit" className="primary-btn auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Verificando...' : 'Verificar código'}
            </button>
          </form>

          {status && <p className="auth-status">{status}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="cuenta-panel">
      <div className="auth-card">
        <div className="auth-brand">HEXFORGE</div>
        <div className="auth-header">
          <span className="eyebrow">League of Coach</span>
          <h1>{authMode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</h1>
        </div>

        <div className="auth-toggle">
          <button
            type="button"
            className={authMode === 'login' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => handleModeChange('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={authMode === 'register' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => handleModeChange('register')}
          >
            Registro
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {authMode === 'register' && (
            <label>
              Nombre
              <input
                name="name"
                value={form.name}
                onChange={handleFieldChange}
                placeholder="Tu nombre"
                required
              />
            </label>
          )}

          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleFieldChange}
              placeholder="tucorreo@ejemplo.com"
              required
            />
          </label>

          <label>
            Contraseña
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleFieldChange}
              placeholder="••••••••"
              minLength={8}
              required
            />
          </label>

          <div id="clerk-captcha" />

          {authMode === 'login' && (
            <button type="button" className="link-btn" onClick={() => setAuthView('forgot-request')}>
              ¿Olvidaste tu contraseña?
            </button>
          )}

          <button type="submit" className="primary-btn auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Procesando...' : authMode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <div className="auth-divider">
          <span>o</span>
        </div>

        <button type="button" className="oauth-btn" onClick={handleGoogleAuth}>
          Continuar con Google
        </button>

        {status && <p className="auth-status">{status}</p>}
      </div>
    </div>
  )
}
