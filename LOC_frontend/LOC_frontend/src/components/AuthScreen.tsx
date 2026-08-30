import type { FormEvent } from 'react'

type AuthMode = 'login' | 'register'

type AuthScreenProps = {
  authMode: AuthMode
  form: { name: string; email: string; password: string }
  status: string
  isSubmitting: boolean
  apiUrl: string
  onModeChange: (mode: AuthMode) => void
  onFieldChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function AuthScreen({
  authMode,
  form,
  status,
  isSubmitting,
  apiUrl,
  onModeChange,
  onFieldChange,
  onSubmit,
}: AuthScreenProps) {
  return (
    <div className="auth-shell">
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
            onClick={() => onModeChange('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={authMode === 'register' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => onModeChange('register')}
          >
            Registro
          </button>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          {authMode === 'register' && (
            <label>
              Nombre
              <input
                name="name"
                value={form.name}
                onChange={onFieldChange}
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
              onChange={onFieldChange}
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
              onChange={onFieldChange}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </label>

          <button type="submit" className="primary-btn auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Procesando...' : authMode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        {status && <p className="auth-status">{status}</p>}
        <p className="auth-help">API: {apiUrl}</p>
      </div>
    </div>
  )
}
