import { AppScreen } from '@/components/layout/AppScreen'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui'

export function HireGate({ state, retry }: { state: string; retry: () => void }) {
  if (state === 'loading')
    return (
      <AppScreen hideNav>
        <ListSkeleton rows={3} />
      </AppScreen>
    )
  if (state === 'error')
    return (
      <AppScreen hideNav>
        <ErrorState onRetry={retry} />
      </AppScreen>
    )
  return (
    <AppScreen hideNav>
      <EmptyState title="Hire not found" description="It may have finished or been cancelled." />
    </AppScreen>
  )
}
