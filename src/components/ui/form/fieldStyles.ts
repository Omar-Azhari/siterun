import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface FieldProps {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  /** Visually hide the label (still read by screen readers). */
  hideLabel?: boolean
  className?: string
}

export const fieldIds = (id: string) => ({ hint: `${id}-hint`, error: `${id}-error` })

export function describedBy(id: string, { hint, error }: Pick<FieldProps, 'hint' | 'error'>) {
  const ids = fieldIds(id)
  return [error && ids.error, hint && ids.hint].filter(Boolean).join(' ') || undefined
}

/** Shared chrome for text-like controls. */
export const controlClass = (error?: string) =>
  cn(
    'flex h-[50px] w-full items-center gap-2.5 rounded-[10px] border bg-input px-3.5 text-base text-fg transition-colors',
    'focus-within:border-primary focus-within:ring-1 focus-within:ring-primary',
    'has-[:disabled]:opacity-50',
    error ? 'border-danger' : 'border-line-input',
  )

export const bareInputClass =
  'h-full min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-subtle disabled:cursor-not-allowed'
