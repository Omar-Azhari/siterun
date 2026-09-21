import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { FullPageSpinner } from '@/auth/guards'

const BrandPage = lazy(() => import('./BrandPage').then((m) => ({ default: m.BrandPage })))
const ComponentsPage = lazy(() =>
  import('./ComponentsPage').then((m) => ({ default: m.ComponentsPage })),
)
const DevScreensPage = lazy(() =>
  import('./DevScreensPage').then((m) => ({ default: m.DevScreensPage })),
)

/** Dev-only pages. The whole module is dropped from production builds. */
export function DevRoutes() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="brand" element={<BrandPage />} />
        <Route path="components" element={<ComponentsPage />} />
        <Route path="screens" element={<DevScreensPage />} />
      </Routes>
    </Suspense>
  )
}
