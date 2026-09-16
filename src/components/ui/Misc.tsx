import { useState, type ReactNode } from 'react'
import { Check, Copy, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatMoney, initials } from '@/lib/format'

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const dims = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-12 text-base' }[size]
  if (src)
    return (
      <img
        src={src}
        alt={name}
        className={cn('shrink-0 rounded-full object-cover', dims, className)}
      />
    )
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold',
        size === 'lg' ? 'bg-primary text-white' : 'bg-[#34445a] text-[#dae4ef]',
        dims,
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}

/** Removable chip ("GP Bucket ×"). */
export function Chip({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) {
  return (
    <span className="inline-flex h-8 items-center gap-1 rounded-lg border border-line-input bg-input pr-1 pl-2.5 text-[13px] text-fg">
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${typeof children === 'string' ? children : 'item'}`}
          className="flex size-6 items-center justify-center rounded-md text-[#dae4ef] hover:bg-white/10"
        >
          <X className="size-3.5" strokeWidth={2.5} />
        </button>
      )}
    </span>
  )
}

export function ProgressBar({
  value,
  label,
  className,
}: {
  value: number
  label: string
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-[#1f3044]', className)}
    >
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  )
}

/** "──── or ────" */
export function OrDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="my-4 flex items-center gap-3 text-[13px] text-muted" role="separator">
      <span className="h-px flex-1 bg-line-input" />
      {label}
      <span className="h-px flex-1 bg-line-input" />
    </div>
  )
}

export function CopyButton({
  value,
  label = 'Copy',
  className,
}: {
  value: string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : label}
      className={cn(
        'flex size-11 items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary/10',
        className,
      )}
    >
      {copied ? (
        <Check className="size-5 text-success" strokeWidth={2.5} />
      ) : (
        <Copy className="size-5" strokeWidth={2} />
      )}
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </button>
  )
}

/** "$320 / day" with the unit smaller and muted. */
export function Price({
  cents,
  unit = 'day',
  size = 'md',
  className,
  prefix,
}: {
  cents: number
  unit?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
  prefix?: string
}) {
  const main = { sm: 'text-sm', md: 'text-[17px]', lg: 'text-2xl' }[size]
  return (
    <span className={cn('whitespace-nowrap', className)}>
      <span className={cn('font-bold text-fg', main)}>
        {prefix}
        {formatMoney(cents)}
      </span>
      {unit && <span className="text-[13px] font-normal text-muted"> / {unit}</span>}
    </span>
  )
}

/** Small solid badge ("Most Popular", "Save 20%"). */
export function Badge({
  children,
  tone = 'primary',
  className,
}: {
  children: ReactNode
  tone?: 'primary' | 'success'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-md px-1.5 text-[11px] font-semibold whitespace-nowrap',
        tone === 'primary' ? 'bg-primary text-white' : 'bg-[#15803d] text-white',
        className,
      )}
    >
      {children}
    </span>
  )
}
