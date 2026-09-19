import { StrictMode, useEffect } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { LandingPage } from './LandingPage'

/** Leaving the landing page loads the full app at the new URL. */
function LoadApp() {
  useEffect(() => window.location.reload(), [])
  return null
}

/**
 * Signed-out visitors at `/` get just the marketing page: no backend client and no
 * app shell, so it paints fast. Any link out of it boots the full app.
 */
export function mountLanding(root: HTMLElement) {
  const app = (
    <StrictMode>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<LoadApp />} />
        </Routes>
      </BrowserRouter>
    </StrictMode>
  )
  // Production builds bake the landing HTML into index.html (scripts/prerender.mjs).
  if (root.hasChildNodes()) hydrateRoot(root, app)
  else createRoot(root).render(app)
}
