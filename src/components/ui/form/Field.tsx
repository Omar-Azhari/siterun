import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { fieldIds, type FieldProps } from './fieldStyles'

interface FieldShellProps extends FieldProps {
  id: string
  children: ReactNode
  /** Right-aligned text on the label line (e.g. "Change"). */
  labelAside?: ReactNode
}

export function Field({
  id,
  label,
  hint,
  error,
  hideLabel,
  className,
  children,
  labelAside,
}: FieldShellProps) {
  const ids = fieldIds(id)
  return (
    <div className={cn('mb-3.5', className)}>
      {label && (
        <div className={cn('mb-1.5 flex items-center justify-between', hideLabel && 'sr-only')}>
          <label htmlFor={id} className="text-sm text-[#dae4ef]">
            {label}
          </label>
          {labelAside}
        </div>
      )}
      {children}
      {error ? (
        <p id={ids.error} role="alert" className="mt-1 text-xs text-[#f87171]">
          {error}
        </p>
      ) : (
        hint && (
          <p id={ids.hint} className="mt-1 text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
