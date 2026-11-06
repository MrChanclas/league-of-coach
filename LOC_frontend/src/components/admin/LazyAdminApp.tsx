import { Suspense, lazy } from 'react'

// Players never download the admin panel's code.
const AdminApp = lazy(() => import('./AdminApp'))

export function LazyAdminApp() {
  return (
    <Suspense fallback={null}>
      <AdminApp />
    </Suspense>
  )
}
