import type { ErrorReport } from '@/data/api'
import { nativePlatform } from '@/native/platform'

/**
 * Sends uncaught errors to the backend so they show up for platform admins
 * (Admin → More → App errors). Each distinct error is sent once per session, and at most
 * 20 per session, so a loop can't flood anything. Only the error, the page path, the app
 * version and the browser are sent: never form contents, query strings or tokens.
 */
const MAX_PER_SESSION = 20
const sent = new Set<string>()

/** Noise that says nothing about SiteRun's own code. */
const IGNORED_MESSAGES = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /^Non-Error promise rejection captured/i,
]
const EXTENSION_FRAME = /(chrome|moz|safari(-web)?)-extension:\/\//

function describe(error: unknown): { message: string; stack: string } {
  if (error instanceof Error) {
    return { message: error.message || error.name || 'Error', stack: error.stack ?? '' }
  }
  if (typeof error === 'string') return { message: error, stack: '' }
  try {
    return { message: JSON.stringify(error)?.slice(0, 300) ?? 'Unknown error', stack: '' }
  } catch {
    return { message: 'Unknown error', stack: '' }
  }
}

export function reportError(error: unknown, context?: string) {
  if (sent.size >= MAX_PER_SESSION) return
  const { message, stack } = describe(error)
  if (IGNORED_MESSAGES.some((r) => r.test(message)) || EXTENSION_FRAME.test(stack)) return
  const full = context ? `${context}: ${message}` : message
  const key = `${full}|${stack.split('\n')[1] ?? ''}`
  if (sent.has(key)) return
  sent.add(key)

  const report: ErrorReport = {
    message: full,
    stack,
    url: window.location.origin + window.location.pathname,
    release: __APP_VERSION__,
    platform: nativePlatform(),
    userAgent: navigator.userAgent,
  }
  void import('@/data/client').then(({ getApi }) => getApi().logClientError(report)).catch(() => {})
}

let installed = false

export function initErrorReporting() {
  if (installed) return
  installed = true
  window.addEventListener('error', (e) => {
    // Only script errors; failed images and the like have no `error`.
    if (e.error || e.message) reportError(e.error ?? e.message)
  })
  window.addEventListener('unhandledrejection', (e) => {
    reportError(e.reason, 'Unhandled promise rejection')
  })
}
