import { useId, useRef, type ReactNode } from 'react'
import { CalendarDays, Clock } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDateLong, formatTime } from '@/lib/format'
import { Field } from './Field'
import { controlClass, describedBy, type FieldProps } from './fieldStyles'

interface PickerFieldProps extends FieldProps {
  type: 'date' | 'time'
  value: string
  onChange: (value: string) => void
  display: string
  icon: ReactNode
  placeholder: string
  min?: string
  max?: string
  step?: number
  disabled?: boolean
  name?: string
  required?: boolean
  id?: string
  compact?: boolean
}

/**
 * Shows a formatted value ("Mon, 26 May 2025") with the native picker layered on top,
 * so mobile keeps the OS picker while the look matches the mockups.
 */
function PickerField({
  type,
  value,
  onChange,
  display,
  icon,
  placeholder,
  label,
  hint,
  error,
  hideLabel,
  className,
  compact,
  id,
  ...rest
}: PickerFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const ref = useRef<HTMLInputElement>(null)
  const open = () => {
    try {
      ref.current?.showPicker()
    } catch {
      ref.current?.focus()
    }
  }
  return (
    <Field
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      className={className}
    >
      <div className={cn(controlClass(error), 'relative', compact && 'h-11 px-3')}>
        <span className="shrink-0 text-[#dae4ef] [&_svg]:size-5">{icon}</span>
        <span className={cn('truncate', value ? 'text-fg' : 'text-subtle', compact && 'text-sm')}>
          {value ? display : placeholder}
        </span>
        <input
          ref={ref}
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={open}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, { hint, error })}
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:size-full"
          {...rest}
        />
      </div>
    </Field>
  )
}

type PublicProps = Omit<PickerFieldProps, 'type' | 'display' | 'icon' | 'placeholder'> & {
  placeholder?: string
}

/** Value is an ISO date string (yyyy-MM-dd). */
export function DateField({ placeholder = 'Select date', ...props }: PublicProps) {
  return (
    <PickerField
      type="date"
      display={formatDateLong(props.value)}
      icon={<CalendarDays strokeWidth={1.75} />}
      placeholder={placeholder}
      {...props}
    />
  )
}

/** Value is "HH:mm". */
export function TimeField({ placeholder = 'Select time', ...props }: PublicProps) {
  return (
    <PickerField
      type="time"
      display={formatTime(props.value)}
      icon={<Clock strokeWidth={1.75} />}
      placeholder={placeholder}
      {...props}
    />
  )
}
