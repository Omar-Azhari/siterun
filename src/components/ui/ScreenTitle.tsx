import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ScreenTitleProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Wizard progress, e.g. { current: 2, total: 6 } → "Step 2 of 6". */
  step?: { current: number; total: number }
  className?: string
  align?: 'left' | 'center'
}

export function ScreenTitle({
  title,
  subtitle,
  step,
  className,
  align = 'left',
}: ScreenTitleProps) {
  return (
    <div className={cn('mb-4', align === 'center' && 'text-center', className)}>
      <h1 className="font-display text-[22px] leading-tight font-bold tracking-[-0.01em] text-fg">
        {title}
      </h1>
      {step && <StepIndicator current={step.current} total={step.total} />}
      {subtitle && <p className="mt-1 text-sm leading-snug text-muted">{subtitle}</p>}
    </div>
  )
}

export function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <p className="mt-0.5 text-sm font-medium text-primary">
      Step {current} of {total}
    </p>
  )
}

/** Small heading above a group ("Team Roles", "Delivery options"). */
export function SectionLabel({
  children,
  action,
  className,
}: {
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mt-5 mb-2 flex items-center justify-between', className)}>
      <h2 className="text-sm font-semibold text-fg">{children}</h2>
      {action && <div className="text-[13px] text-primary">{action}</div>}
    </div>
  )
}
