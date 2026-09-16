import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { CircleCheck, Eye, EyeOff, Search, X } from 'lucide-react'
import { Field } from './Field'
import { bareInputClass, controlClass, describedBy, type FieldProps } from './fieldStyles'

export interface InputProps
  extends FieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  leftIcon?: ReactNode
  rightSlot?: ReactNode
  /** Green tick on the right (e.g. valid ABN). */
  valid?: boolean
  labelAside?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, hideLabel, className, leftIcon, rightSlot, valid, labelAside, id, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <Field
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      className={className}
      labelAside={labelAside}
    >
      <div className={controlClass(error)}>
        {leftIcon && <span className="shrink-0 text-muted [&_svg]:size-5">{leftIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, { hint, error })}
          className={bareInputClass}
          {...rest}
        />
        {valid && (
          <CircleCheck
            role="img"
            aria-label="Valid"
            className="size-5 shrink-0 fill-success text-app"
            strokeWidth={2}
          />
        )}
        {rightSlot}
      </div>
    </Field>
  )
})

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'rightSlot'>>(
  function PasswordInput(props, ref) {
    const [shown, setShown] = useState(false)
    return (
      <Input
        ref={ref}
        type={shown ? 'text' : 'password'}
        autoComplete="current-password"
        {...props}
        rightSlot={
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? 'Hide password' : 'Show password'}
            aria-pressed={shown}
            className="-mr-2 flex size-10 items-center justify-center rounded-lg text-[#dae4ef] hover:bg-white/5"
          >
            {shown ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        }
      />
    )
  },
)

interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'rightSlot' | 'type'> {
  onClear?: () => void
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { onClear, value, label = 'Search', hideLabel = true, ...rest },
  ref,
) {
  return (
    <Input
      ref={ref}
      type="search"
      label={label}
      hideLabel={hideLabel}
      value={value}
      leftIcon={<Search strokeWidth={1.75} />}
      rightSlot={
        onClear && value ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="-mr-2 flex size-10 items-center justify-center rounded-lg text-[#dae4ef] hover:bg-white/5"
          >
            <X className="size-5" />
          </button>
        ) : undefined
      }
      {...rest}
    />
  )
})
