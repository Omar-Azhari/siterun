import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Screens open at the top, like native navigation. */
export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
