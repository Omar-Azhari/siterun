import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Field } from './Field'
import { describedBy, type FieldProps } from './fieldStyles'

interface TextareaProps
  extends FieldProps, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  /** Shows "62/250" when set. Pass the current value length via `value`. */
  maxLength?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    hint,
    error,
    hideLabel,
    className,
    maxLength,
    id,
    rows = 4,
    value,
    defaultValue,
    ...rest
  },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const length = String(value ?? defaultValue ?? '').length
  return (
    <Field
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      className={className}
    >
      <div
        className={cn(
          'rounded-[10px] border bg-input px-3.5 pt-3 pb-2 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary',
          error ? 'border-danger' : 'border-line-input',
        )}
      >
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, { hint, error })}
          className="block w-full resize-none bg-transparent text-base leading-snug text-fg outline-none placeholder:text-subtle"
          {...rest}
        />
        {maxLength !== undefined && (
          <p className="mt-1 text-right text-xs text-muted" aria-live="polite">
            {length}/{maxLength}
          </p>
        )}
      </div>
    </Field>
  )
})
