import * as Sentry from '@sentry/react'
import { SENTRY_DSN } from '../constants/runtime'

export function initSentry() {
  if (!SENTRY_DSN) return

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.PROD ? 'production' : 'development',
    release: import.meta.env.VITE_RELEASE || __APP_VERSION__,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  })
}
