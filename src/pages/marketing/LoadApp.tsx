import { useEffect } from 'react'

/** Leaving the landing page loads the full app at the new URL. */
export function LoadApp() {
  useEffect(() => window.location.reload(), [])
  return null
}
