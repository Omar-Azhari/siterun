import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { COUNTRIES, type CountryCode } from './phone'
import { Field } from './Field'
import { bareInputClass, controlClass, describedBy, type FieldProps } from './fieldStyles'

interface PhoneFieldProps
  extends FieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'> {
  country: CountryCode
  onCountryChange: (code: CountryCode) => void
}

export const PhoneField = forwardRef<HTMLInputElement, PhoneFieldProps>(function PhoneField(
  {
    label = 'Phone number',
    hint,
    error,
    hideLabel,
    className,
    country,
    onCountryChange,
    id,
    ...rest
  },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const current = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0]
  const { Flag } = current
  return (
    <Field
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      className={className}
    >
      <div className="flex gap-1.5">
        <div className={cn(controlClass(), 'relative w-[108px] shrink-0 gap-2 px-3')}>
          <Flag className="h-4 w-7 shrink-0 rounded-[2px]" />
          <span className="text-base">{current.dial}</span>
          <ChevronDown aria-hidden className="ml-auto size-4 text-[#dae4ef]" />
          <select
            aria-label="Country code"
            value={country}
            onChange={(e) => onCountryChange(e.target.value as CountryCode)}
            className="absolute inset-0 cursor-pointer opacity-0 [&>option]:bg-card"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.dial})
              </option>
            ))}
          </select>
        </div>
        <div className={cn(controlClass(error), 'flex-1')}>
          <input
            ref={ref}
            id={inputId}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(inputId, { hint, error })}
            className={bareInputClass}
            {...rest}
          />
        </div>
      </div>
    </Field>
  )
})
