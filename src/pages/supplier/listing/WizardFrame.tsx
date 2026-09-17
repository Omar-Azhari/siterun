import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppScreen } from '@/components/layout/AppScreen'
import { Button, EmptyState, ErrorState, ListSkeleton, ScreenTitle } from '@/components/ui'
import type { Machine } from '@/data/types'
import { stepNumber, type StepId } from './listingShared'

interface WizardFrameProps {
  step: StepId
  title: string
  subtitle: string
  children: ReactNode
  onContinue: () => void
  continueLabel?: string
  saving?: boolean
  disabled?: boolean
}

/** Shared chrome for the six "Add Machine" steps (board 07). */
export function WizardFrame({ step, title, subtitle, children, onContinue, continueLabel = 'Continue', saving, disabled }: WizardFrameProps) {
  return (
    <AppScreen
      hideNav
      footer={
        <Button arrow onClick={onContinue} loading={saving} disabled={disabled}>
          {continueLabel}
        </Button>
      }
    >
      <ScreenTitle title={title} step={{ current: stepNumber(step), total: 6 }} subtitle={subtitle} />
      {children}
    </AppScreen>
  )
}

/** Loading / error / locked states while the draft loads. */
export function ListingGate({ query, machine }: { query: { isPending: boolean; isError: boolean; refetch: () => unknown }; machine: Machine | null | undefined }) {
  const navigate = useNavigate()
  if (query.isPending) return <AppScreen hideNav><ListSkeleton rows={4} /></AppScreen>
  if (query.isError) return <AppScreen hideNav><ErrorState onRetry={() => void query.refetch()} /></AppScreen>
  if (!machine) return <AppScreen hideNav><EmptyState title="Listing not found" /></AppScreen>
  return (
    <AppScreen hideNav>
      <EmptyState
        title="This listing can’t be edited right now"
        description={machine.status === 'pending_review' ? 'It’s being reviewed by SiteRun. We’ll let you know within 1 business day.' : 'Pause the listing before making changes.'}
        action={<Button size="md" onClick={() => navigate('/supplier/machines')}>Back to machines</Button>}
      />
    </AppScreen>
  )
}

