import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { cardClass } from './Card'

export const selectedClass =
  'border-primary bg-gradient-to-b from-selected to-[#012a57] shadow-[0_0_0_1px_var(--color-primary)_inset]'

/** Empty ring / filled blue dot. */
export function RadioMark({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
        checked ? 'border-primary bg-primary' : 'border-muted',
        className,
      )}
    >
      {checked && <span className="size-2 rounded-full bg-white" />}
    </span>
  )
}

/** Empty ring / blue circle with a tick. */
export function CheckMark({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
        checked ? 'border-primary bg-primary' : 'border-muted',
        className,
      )}
    >
      {checked && <Check className="size-3.5 text-white" strokeWidth={3} />}
    </span>
  )
}

interface SelectableCardProps {
  selected: boolean
  onSelect: () => void
  /** `radio` = single choice group; `check` = tick indicator (still single choice). */
  indicator?: 'radio' | 'check' | 'none'
  /** Where the indicator sits. Mockups use both. */
  indicatorPosition?: 'left' | 'right' | 'top-right' | 'top-left'
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** Right-aligned content (price) or badge. */
  aside?: ReactNode
  children?: ReactNode
  className?: string
  disabled?: boolean
  /** Accessible name when `title` is not plain text. */
  label?: string
}

/**
 * A card that behaves as a radio button. Place several inside an element with
 * `role="radiogroup"` and an `aria-label`.
 */
export function SelectableCard({
  selected,
  onSelect,
  indicator = 'radio',
  indicatorPosition = 'right',
  icon,
  title,
  description,
  aside,
  children,
  className,
  disabled,
  label,
}: SelectableCardProps) {
  const Mark = indicator === 'check' ? CheckMark : RadioMark
  const mark = indicator !== 'none' && <Mark checked={selected} />
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        cardClass,
        'relative flex w-full items-center gap-3 p-3 text-left transition-colors disabled:opacity-45',
        selected ? selectedClass : 'hover:border-line-input',
        className,
      )}
    >
      {indicatorPosition === 'left' && mark}
      {icon && <span className="shrink-0 text-primary">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-fg">{title}</span>
        {description && (
          <span className="mt-0.5 block text-sm leading-snug text-muted">{description}</span>
        )}
        {children}
      </span>
      {aside && <span className="shrink-0 text-right">{aside}</span>}
      {indicatorPosition === 'right' && mark}
      {indicatorPosition === 'top-right' && <span className="absolute top-3 right-3">{mark}</span>}
      {indicatorPosition === 'top-left' && <span className="absolute top-3 left-3">{mark}</span>}
    </button>
  )
}
