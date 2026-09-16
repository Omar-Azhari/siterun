import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export type StepState = 'done' | 'current' | 'upcoming'

export interface TimelineStep {
  title: string
  state: StepState
  /** Lines under the title (time, place). */
  details?: ReactNode[]
}

const stateLabel: Record<StepState, string> = {
  done: 'completed',
  current: 'in progress',
  upcoming: 'not started',
}

export function Timeline({ steps, className }: { steps: TimelineStep[]; className?: string }) {
  return (
    <ol className={cn('relative', className)}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1
        const nextActive = steps[i + 1] && steps[i + 1]?.state !== 'upcoming'
        return (
          <li key={step.title} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className={cn(
                  'absolute top-8 bottom-1 left-[13px] w-0.5 rounded-full',
                  step.state === 'done' && nextActive ? 'bg-primary' : 'bg-[#4b5a6e]',
                )}
              />
            )}
            <Dot state={step.state} last={last} />
            <div className="min-w-0 pt-0.5">
              <p
                className={cn(
                  'text-sm font-semibold',
                  step.state === 'upcoming' && last ? 'font-normal text-muted' : 'text-fg',
                )}
              >
                {step.title}
                <span className="sr-only">, {stateLabel[step.state]}</span>
              </p>
              {step.details?.map((d, j) => (
                <div key={j} className="mt-0.5 text-[13px] text-muted">
                  {d}
                </div>
              ))}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function Dot({ state, last }: { state: StepState; last: boolean }) {
  if (state === 'done')
    return (
      <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary">
        <Check aria-hidden className="size-4 text-white" strokeWidth={3} />
      </span>
    )
  if (state === 'current')
    return (
      <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary ring-4 ring-primary/25">
        <span className="size-2.5 rounded-full bg-white" />
      </span>
    )
  return (
    <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#4b5a6e]">
      {!last && <span className="size-2.5 rounded-full bg-white" />}
    </span>
  )
}
