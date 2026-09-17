import { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui'
import { AuthSync } from '@/auth/AuthSync'
import { FullPageSpinner } from '@/auth/guards'
import { AppRoutes } from './routes'
import { ScrollToTop } from './components/layout/ScrollToTop'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <AuthSync />
          <ScrollToTop />
          <Suspense fallback={<FullPageSpinner />}>
            <AppRoutes />
          </Suspense>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
