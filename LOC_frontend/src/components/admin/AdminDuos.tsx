import { useState } from 'react'
import { useAdminDuos } from '../../hooks/useAdmin'
import { formatAccount, formatDate } from './adminFormat'

export function AdminDuos() {
  const [status, setStatus] = useState<'active' | 'ended'>('active')
  const duosQuery = useAdminDuos(status)
  const duos = duosQuery.data ?? []

  return (
    <section className="admin-section">
      <div className="admin-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={status === 'active'} onClick={() => setStatus('active')}>
          Activos
        </button>
        <button type="button" role="tab" aria-selected={status === 'ended'} onClick={() => setStatus('ended')}>
          Terminados
        </button>
      </div>

      {duosQuery.isLoading && <p className="admin-muted">Cargando duos…</p>}
      {duosQuery.isError && <p className="admin-error">{duosQuery.error.message}</p>}
      {duosQuery.isSuccess && duos.length === 0 && (
        <p className="empty-state">{status === 'active' ? 'No hay duos activos.' : 'No hay duos terminados.'}</p>
      )}

      {duos.map((duo) => (
        <article key={duo.id} className="admin-card">
          <header className="admin-card-head">
            <strong>
              {duo.userA.name} + {duo.userB.name}
            </strong>
            <span className="admin-badge">{duo.queue === 'flex' ? 'Flex' : 'Solo/Dúo'}</span>
            {duo._count.reports > 0 && (
              <span className="admin-badge admin-badge--pending">
                {duo._count.reports} {duo._count.reports === 1 ? 'reporte' : 'reportes'}
              </span>
            )}
          </header>
          <ul className="admin-list">
            <li>{formatAccount(duo.accountA)}</li>
            <li>{formatAccount(duo.accountB)}</li>
          </ul>
          <p className="admin-muted">
            Desde el {formatDate(duo.createdAt)}
            {duo.endedAt && ` hasta el ${formatDate(duo.endedAt)}`} · {duo._count.messages} mensajes
          </p>
        </article>
      ))}
    </section>
  )
}
