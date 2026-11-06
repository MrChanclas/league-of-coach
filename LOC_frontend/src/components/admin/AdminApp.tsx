import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import '../../styles/index.css'
import '../../styles/admin.css'
import { useAdminOverview } from '../../hooks/useAdmin'
import { ADMIN_LOGOUT_EVENT, clearAdminToken, readAdminToken } from '../../lib/adminApi'
import { AdminDuos } from './AdminDuos'
import { AdminLogin } from './AdminLogin'
import { AdminReports } from './AdminReports'
import { AdminUsers } from './AdminUsers'

type AdminSection = 'reportes' | 'usuarios' | 'duos'

const SECTIONS: { key: AdminSection; label: string }[] = [
  { key: 'reportes', label: 'Reportes' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'duos', label: 'Duos' },
]

/** The admin panel at /admin: its own login, outside Clerk, and no player UI. */
export default function AdminApp() {
  const queryClient = useQueryClient()
  const [isSignedIn, setIsSignedIn] = useState(() => Boolean(readAdminToken()))

  useEffect(() => {
    const handleLogout = () => setIsSignedIn(false)
    window.addEventListener(ADMIN_LOGOUT_EVENT, handleLogout)
    return () => window.removeEventListener(ADMIN_LOGOUT_EVENT, handleLogout)
  }, [])

  const handleSignOut = () => {
    clearAdminToken()
    queryClient.removeQueries({ queryKey: ['admin'] })
    setIsSignedIn(false)
  }

  if (!isSignedIn) return <AdminLogin onSignedIn={() => setIsSignedIn(true)} />
  return <AdminPanel onSignOut={handleSignOut} />
}

function AdminPanel({ onSignOut }: { onSignOut: () => void }) {
  const [section, setSection] = useState<AdminSection>('reportes')
  const overview = useAdminOverview().data

  const stats = overview && [
    { label: 'Reportes pendientes', value: overview.pendingReports, alert: overview.pendingReports > 0 },
    { label: 'Usuarios', value: overview.users },
    { label: 'Cuentas de Riot', value: overview.accounts },
    { label: 'Duos activos', value: overview.activeDuos },
    { label: 'Con strikes vigentes', value: overview.usersWithStrikes },
    { label: 'Fuera de Social', value: overview.bannedUsers },
  ]

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <div className="page-head-eyebrow">LEAGUE OF COACH</div>
          <h1>Panel de admin</h1>
        </div>
        <button type="button" className="secondary-btn" onClick={onSignOut}>
          Cerrar sesión
        </button>
      </header>

      {stats && (
        <div className="admin-stats">
          {stats.map((stat) => (
            <div key={stat.label} className={`admin-stat${stat.alert ? ' admin-stat--alert' : ''}`}>
              <span>{stat.value}</span>
              {stat.label}
            </div>
          ))}
        </div>
      )}

      <nav className="admin-nav" aria-label="Secciones del panel">
        {SECTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-current={section === item.key ? 'page' : undefined}
            onClick={() => setSection(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {section === 'reportes' && <AdminReports />}
      {section === 'usuarios' && <AdminUsers />}
      {section === 'duos' && <AdminDuos />}
    </div>
  )
}
