import { useState } from 'react'
import type { FormEvent } from 'react'
import { useClerk, useSignIn, useSignUp, useUser } from '@clerk/clerk-react'

type AuthMode = 'login' | 'register'

function getClerkErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'errors' in error) {
    const clerkError = error as { errors?: { message?: string; longMessage?: string }[] }
    return clerkError.errors?.[0]?.longMessage ?? clerkError.errors?.[0]?.message ?? fallback
  }
  return error instanceof Error ? error.message : fallback
}

export function CuentaTabPanel() {
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser()
  const { signIn, setActive: setActiveSignIn, isLoaded: isSignInLoaded } = useSignIn()
  const { signUp, setActive: setActiveSignUp, isLoaded: isSignUpLoaded } = useSignUp()
  const { signOut } = useClerk()

  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [code, setCode] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleModeChange = (mode: AuthMode) => {
    setAuthMode(mode)
    setPendingVerification(false)
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

  const handleLogout = () => {
    setStatus('')
    void signOut()
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

  if (isSignedIn && user) {
    const displayName = user.fullName ?? user.primaryEmailAddress?.emailAddress ?? 'Coach'
    const displayEmail = user.primaryEmailAddress?.emailAddress ?? ''

    return (
      <div className="cuenta-panel">
        <div className="auth-card">
          <div className="auth-brand">HEXFORGE</div>
          <div className="auth-header">
            <span className="eyebrow">League of Coach</span>
            <h1>Tu cuenta</h1>
          </div>

          <div className="cuenta-profile">
            <span
              className="avatar large"
              style={{ background: '#0ac8b922', borderColor: '#0ac8b988', color: '#0ac8b9' }}
            >
              {displayName.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{displayName}</strong>
              <small>{displayEmail}</small>
            </div>
          </div>

          <button type="button" className="secondary-btn auth-submit" onClick={handleLogout}>
            Cerrar sesión
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

          <button type="submit" className="primary-btn auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Procesando...' : authMode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        {status && <p className="auth-status">{status}</p>}
      </div>
    </div>
  )
}
