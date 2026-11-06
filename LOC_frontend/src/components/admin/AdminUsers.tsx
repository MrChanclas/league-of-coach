import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { useAdminUserStrikes, useAdminUsers, useRevokeStrikeMutation } from '../../hooks/useAdmin'
import type { AdminStrike, AdminUser } from '../../types/admin'
import { SEVERITY_LABELS, formatAccount, formatDate } from './adminFormat'

export function AdminUsers() {
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const usersQuery = useAdminUsers(search)
  const users = usersQuery.data ?? []

  const handleSearch = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSearch(draft.trim())
  }

  return (
    <section className="admin-section">
      <form className="admin-search" onSubmit={handleSearch}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Buscar por nombre, correo o invocador"
          aria-label="Buscar usuarios"
        />
        <button type="submit" className="secondary-btn">
          Buscar
        </button>
      </form>

      {usersQuery.isLoading && <p className="admin-muted">Cargando usuarios…</p>}
      {usersQuery.isError && <p className="admin-error">{usersQuery.error.message}</p>}
      {usersQuery.isSuccess && users.length === 0 && <p className="empty-state">No hay usuarios que coincidan.</p>}

      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </section>
  )
}

function UserCard({ user }: { user: AdminUser }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <article className="admin-card">
      <header className="admin-card-head">
        <strong>{user.name}</strong>
        {user.banned && <span className="admin-badge admin-badge--sanctioned">Fuera de Social</span>}
        {user.lookingForDuo && <span className="admin-badge">Buscando duo</span>}
      </header>
      <p className="admin-muted">
        {user.email}
        {user.discordUsername && ` · Discord: ${user.discordUsername}`} · registrado el {formatDate(user.createdAt)}
      </p>
      {user.accounts.length > 0 ? (
        <ul className="admin-list">
          {user.accounts.map((account) => (
            <li key={account.id}>{formatAccount(account)}</li>
          ))}
        </ul>
      ) : (
        <p className="admin-muted">Sin cuentas de Riot vinculadas.</p>
      )}
      <div className="admin-actions">
        <span className={user.banned ? 'admin-error' : 'admin-muted'}>
          {user.activePoints} {user.activePoints === 1 ? 'strike vigente' : 'strikes vigentes'}
          {user.banned && user.bannedUntil && ` · hasta ${formatDate(user.bannedUntil)}`}
        </span>
        <button type="button" className="secondary-btn" onClick={() => setIsOpen((open) => !open)}>
          {isOpen ? 'Ocultar historial' : 'Ver historial de strikes'}
        </button>
      </div>
      {isOpen && <StrikeHistory userId={user.id} />}
    </article>
  )
}

function StrikeHistory({ userId }: { userId: string }) {
  const strikesQuery = useAdminUserStrikes(userId)
  const revokeMutation = useRevokeStrikeMutation()
  const strikes = strikesQuery.data ?? []

  const handleRevoke = (strike: AdminStrike) => {
    if (!window.confirm(`¿Anular este strike ${SEVERITY_LABELS[strike.severity].toLowerCase()}? Dejará de contar.`)) return
    revokeMutation.mutate(strike.id)
  }

  if (strikesQuery.isLoading) return <p className="admin-muted">Cargando historial…</p>
  if (strikes.length === 0) return <p className="admin-muted">Sin strikes.</p>

  return (
    <ul className="admin-strikes">
      {strikes.map((strike) => {
        return (
          <li key={strike.id} className={strike.active ? '' : 'admin-strike--inactive'}>
            <span>
              <strong>
                {SEVERITY_LABELS[strike.severity]} ({strike.points})
              </strong>{' '}
              · {formatDate(strike.createdAt)} · {strike.reason}
            </span>
            <span className="admin-muted">
              {strike.revokedAt
                ? `Anulado el ${formatDate(strike.revokedAt)}`
                : strike.active
                  ? `Vence el ${formatDate(strike.expiresAt)}`
                  : `Venció el ${formatDate(strike.expiresAt)}`}
            </span>
            {strike.active && (
              <button
                type="button"
                className="secondary-btn"
                disabled={revokeMutation.isPending}
                onClick={() => handleRevoke(strike)}
              >
                Anular
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
