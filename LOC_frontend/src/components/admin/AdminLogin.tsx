import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { useAdminLoginMutation } from '../../hooks/useAdmin'
import { saveAdminToken } from '../../lib/adminApi'

export function AdminLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const loginMutation = useAdminLoginMutation()

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    try {
      const { token } = await loginMutation.mutateAsync({ username, password })
      saveAdminToken(token)
      onSignedIn()
    } catch (caught) {
      setPassword('')
      setError(caught instanceof Error ? caught.message : 'No se pudo iniciar sesión.')
    }
  }

  return (
    <main className="admin-login">
      <form className="admin-login-card" onSubmit={(event) => void handleSubmit(event)}>
        <div className="page-head-eyebrow">LEAGUE OF COACH</div>
        <h1>Panel de admin</h1>
        <label>
          Usuario
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" className="primary-btn" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Entrando…' : 'Entrar'}
        </button>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </main>
  )
}
