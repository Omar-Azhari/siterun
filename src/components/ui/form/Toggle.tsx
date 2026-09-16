import { useId, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { cardClass } from '../Card'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  id?: string
  /** Hide the visible label (the switch is still named). */
  labelledBy?: string
}

export function Toggle({ checked, onChange, label, disabled, id, labelledBy }: ToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group -m-2 inline-flex shrink-0 items-center p-2 disabled:opacity-45"
    >
      <span
        className={cn(
          'flex h-7 w-12 items-center rounded-full p-[3px] transition-colors',
          checked ? 'bg-primary' : 'bg-[#34445a]',
        )}
      >
        <span
          className={cn(
            'size-[22px] rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </button>
  )
}

interface ToggleRowProps extends Omit<ToggleProps, 'label' | 'labelledBy'> {
  icon?: ReactNode
  title: string
  description?: ReactNode
  className?: string
  /** Render inside a card (board 07) or bare (board 03 insurance row). */
  card?: boolean
}

export function ToggleRow({
  icon,
  title,
  description,
  className,
  card = true,
  ...toggle
}: ToggleRowProps) {
  const id = useId()
  return (
    <div className={cn('flex items-center gap-3', card ? cn(cardClass, 'p-3') : 'py-2', className)}>
      {icon && <span className="shrink-0 text-primary [&_svg]:size-7">{icon}</span>}
      <div className="min-w-0 flex-1">
        <p id={id} className="text-sm font-semibold text-fg">
          {title}
        </p>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <Toggle label={title} labelledBy={id} {...toggle} />
    </div>
  )
}

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function Checkbox({ checked, onChange, children, className, disabled }: CheckboxProps) {
  return (
    <label
      className={cn(
        'inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-[13px] text-[#dae4ef]',
        disabled && 'cursor-not-allowed opacity-45',
        className,
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden
        className={cn(
          'flex size-5 items-center justify-center rounded-[5px] border-[1.5px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-app',
          checked ? 'border-primary bg-primary' : 'border-muted',
        )}
      >
        {checked && <Check className="size-3.5 text-white" strokeWidth={3} />}
      </span>
      {children}
    </label>
  )
}
