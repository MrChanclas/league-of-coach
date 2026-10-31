import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { QueryClientProvider } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import { CLERK_PUBLISHABLE_KEY } from './constants/runtime'
import { queryClient } from './lib/queryClient'
import { initSentry } from './lib/sentry'

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Falta la variable de entorno VITE_CLERK_PUBLISHABLE_KEY')
}

initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Ocurrió un error inesperado. Recarga la página.</p>}>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ClerkProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
