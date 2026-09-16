import type { ReactNode } from 'react'
import { CircleAlert, Inbox } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'
import { cardClass } from './Card'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(cardClass, 'flex flex-col items-center px-6 py-10 text-center', className)}>
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary [&_svg]:size-7">
        {icon ?? <Inbox strokeWidth={1.75} />}
      </div>
      <h2 className="mt-4 text-base font-semibold text-fg">{title}</h2>
      {description && <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>}
      {action && <div className="mt-5 w-full max-w-xs">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  description?: ReactNode
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We couldn’t load this right now. Check your connection and try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        cardClass,
        'flex flex-col items-center border-danger/40 px-6 py-10 text-center',
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-danger/15 text-[#f87171]">
        <CircleAlert className="size-7" strokeWidth={1.75} />
      </div>
      <h2 className="mt-4 text-base font-semibold text-fg">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="md" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-white/[0.07]', className)} />
}

/** Placeholder list of card rows. */
export function ListSkeleton({ rows = 3, thumb = true }: { rows?: number; thumb?: boolean }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-2.5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={cn(cardClass, 'flex items-center gap-3 p-3')}>
          {thumb && <Skeleton className="size-16 shrink-0 rounded-[10px]" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}
