import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { hasStoredSession } from './data/session'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element missing')

if (window.location.pathname === '/' && !hasStoredSession()) {
  void import('./pages/marketing/landingRoot').then(({ mountLanding }) => mountLanding(root))
} else {
  void import('./App').then(({ App }) =>
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
}
