import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useMe } from '@/data/hooks'
import { hasStoredSession } from '@/data/session'
import { ErrorState } from '@/components/ui'
import { areaFor, homePathFor, needsOnboarding, type AppArea } from './roles'

export function FullPageSpinner() {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center">
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

function Gate({
  children,
}: {
  children: (me: NonNullable<ReturnType<typeof useMe>['data']>) => ReactNode
}) {
  const me = useMe()
  const location = useLocation()
  if (me.isPending) return <FullPageSpinner />
  if (me.isError)
    return (
      <div className="mx-auto max-w-md p-6">
        <ErrorState onRetry={() => void me.refetch()} />
      </div>
    )
  if (!me.data) {
    const next = location.pathname + location.search
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }
  return <>{children(me.data)}</>
}

/** Signed in, and business profile complete (unless on the onboarding page itself). */
export function RequireAuth() {
  const location = useLocation()
  return (
    <Gate>
      {(me) =>
        needsOnboarding(me) && !location.pathname.startsWith('/onboarding') ? (
          <Navigate to="/onboarding/business" replace />
        ) : (
          <Outlet />
        )
      }
    </Gate>
  )
}

/** Restricts a route group to one part of the app. */
export function RequireArea({ area }: { area: AppArea | AppArea[] }) {
  const allowed = Array.isArray(area) ? area : [area]
  return (
    <Gate>
      {(me) =>
        allowed.includes(areaFor(me)) ? <Outlet /> : <Navigate to={homePathFor(me)} replace />
      }
    </Gate>
  )
}

/** Login/sign-up pages bounce signed-in users to their home. */
export function PublicOnly() {
  const me = useMe()
  const location = useLocation()
  // Without a stored session the visitor is signed out: show the page straight away.
  if (me.isPending && hasStoredSession()) return <FullPageSpinner />
  if (me.data && !location.pathname.startsWith('/verify')) {
    const next = new URLSearchParams(location.search).get('next')
    const target = needsOnboarding(me.data)
      ? '/onboarding/business'
      : next && next.startsWith('/')
        ? next
        : homePathFor(me.data)
    return <Navigate to={target} replace />
  }
  return <Outlet />
}
