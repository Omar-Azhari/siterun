import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { hasStoredSession } from './data/session'
import { isNative } from './native/platform'
import { initErrorReporting } from './lib/errorReporting'
import './index.css'

initErrorReporting()

const root = document.getElementById('root')
if (!root) throw new Error('Root element missing')

// index.html hides the prerendered landing markup for signed-in visitors and inside the
// apps (scripts/prerender.mjs); show the page again once React has taken over.
const reveal = () => document.documentElement.classList.remove('app-boot')

// The marketing page is for signed-out web visitors only; the apps open at Welcome.
if (window.location.pathname === '/' && !hasStoredSession() && !isNative()) {
  void import('./pages/marketing/landingRoot').then(({ mountLanding }) => {
    reveal()
    mountLanding(root)
  })
} else {
  void import('./App').then(({ App }) => {
    reveal()
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    if (isNative()) void import('./native/bootstrap').then(({ initNative }) => initNative())
  })
}

// Offline support for the website. Inside the apps Capacitor serves the files locally.
if (!isNative() && import.meta.env.PROD && 'serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
}
