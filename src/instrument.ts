import * as React from "react"
import * as SentryCapacitor from "@sentry/capacitor"
import * as SentryReact from "@sentry/react"
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType
} from "react-router-dom"

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined

const tracePropagationTargets: Array<string | RegExp> = ["localhost"]

if (supabaseUrl) {
  try {
    tracePropagationTargets.push(new URL(supabaseUrl).origin)
  } catch {
    // Ignore invalid URL, fallback targets remain.
  }
}

SentryCapacitor.init(
  {
    dsn,
    enabled: Boolean(dsn),
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION as string | undefined,
    sendDefaultPii: true,
    integrations: [
      SentryReact.reactRouterV7BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes
      }),
      SentryReact.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true
      })
    ],
    tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.2,
    tracePropagationTargets,
    replaysSessionSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
    replaysOnErrorSampleRate: 1.0,
    enableLogs: true
  },
  SentryReact.init
)
