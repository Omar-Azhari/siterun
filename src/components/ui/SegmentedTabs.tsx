import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TabOption<T extends string> {
  value: T
  label: ReactNode
  count?: number
  /** Extra badge after the label ("Save 20%"). */
  badge?: ReactNode
}

interface SegmentedTabsProps<T extends string> {
  options: TabOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  /**
   * `split`: separate bordered pills (boards 04, 09, 10).
   * `joined`: one bordered bar (boards 02, 05, 07).
   */
  variant?: 'split' | 'joined'
  className?: string
  /** id prefix so panels can reference tabs via aria-controls. */
  idPrefix?: string
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  label,
  variant = 'split',
  className,
  idPrefix,
}: SegmentedTabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = (i + delta + options.length) % options.length
    const opt = options[next]
    if (opt) {
      onChange(opt.value)
      refs.current[next]?.focus()
    }
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'flex',
        variant === 'split' ? 'gap-1.5' : 'rounded-xl border border-line bg-card p-1',
        className,
      )}
    >
      {options.map((opt, i) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            id={idPrefix ? `${idPrefix}-tab-${opt.value}` : undefined}
            aria-controls={idPrefix ? `${idPrefix}-panel` : undefined}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 px-2 text-[13px] whitespace-nowrap transition-colors',
              variant === 'split'
                ? cn(
                    'rounded-[10px] border',
                    active
                      ? 'border-primary bg-primary font-semibold text-white'
                      : 'border-line bg-card text-[#d3dae4] hover:border-line-input',
                  )
                : cn(
                    'rounded-lg',
                    active
                      ? 'bg-primary font-semibold text-white'
                      : 'text-[#d3dae4] hover:bg-white/5',
                  ),
            )}
          >
            <span>
              {opt.label}
              {opt.count !== undefined && ` (${opt.count})`}
            </span>
            {opt.badge}
          </button>
        )
      })}
    </div>
  )
}
