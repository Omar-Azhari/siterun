import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Field } from './Field'
import { controlClass, describedBy, type FieldProps } from './fieldStyles'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps
  extends FieldProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  options: SelectOption[]
  placeholder?: string
  leftIcon?: ReactNode
}

/** Native select (best on mobile) styled to match the mockups. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, hideLabel, className, options, placeholder, leftIcon, id, ...rest },
  ref,
) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <Field
      id={selectId}
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      className={className}
    >
      <div className={cn(controlClass(error), 'relative')}>
        {leftIcon && <span className="shrink-0 text-muted [&_svg]:size-5">{leftIcon}</span>}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(selectId, { hint, error })}
          className="h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-8 text-base text-fg outline-none invalid:text-subtle disabled:cursor-not-allowed [&>option]:bg-card [&>option]:text-fg"
          required={placeholder ? true : rest.required}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3.5 size-5 text-[#dae4ef]"
          strokeWidth={1.75}
        />
      </div>
    </Field>
  )
})
