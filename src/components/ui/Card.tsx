import { useState, type HTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ImageOff, Info } from 'lucide-react'
import { cn } from '@/lib/cn'

export const cardClass = 'rounded-[14px] border border-line bg-gradient-to-b from-card to-card-2'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(cardClass, 'p-3.5', className)} {...rest} />
}

interface ListRowProps {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  /** Right-aligned content before the chevron (pill, price, time). */
  trailing?: ReactNode
  chevron?: boolean
  to?: string
  onClick?: () => void
  className?: string
  /** Renders without its own card chrome (for rows grouped inside one card). */
  plain?: boolean
}

export function ListRow({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  chevron = true,
  to,
  onClick,
  className,
  plain,
}: ListRowProps) {
  const body = (
    <>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold text-fg">{title}</div>
        {subtitle && <div className="mt-0.5 text-sm leading-snug text-muted">{subtitle}</div>}
        {meta && <div className="mt-1 text-xs leading-snug text-muted">{meta}</div>}
      </div>
      {trailing && <div className="shrink-0 self-start">{trailing}</div>}
      {chevron && (to || onClick) && (
        <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" strokeWidth={1.75} />
      )}
    </>
  )
  const cls = cn(
    'flex w-full items-center gap-3 text-left',
    plain ? 'py-3' : cn(cardClass, 'p-3'),
    (to || onClick) && 'transition-colors hover:border-line-input hover:brightness-110',
    className,
  )
  if (to)
    return (
      <Link to={to} className={cls}>
        {body}
      </Link>
    )
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    )
  return <div className={cls}>{body}</div>
}

/** Rounded photo with a graceful fallback. */
export function Thumbnail({
  src,
  alt,
  className,
}: {
  src?: string | null
  alt: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const box = cn('overflow-hidden rounded-[10px] bg-input', className ?? 'size-16')
  if (!src || failed)
    return (
      <div
        className={cn(box, 'flex items-center justify-center text-subtle')}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="size-5" strokeWidth={1.5} />
      </div>
    )
  return (
    <div className={box}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="size-full object-cover"
      />
    </div>
  )
}

/** Blue-outlined circle icon for list rows (board 05 account rows, board 08 doc rows). */
export function RowIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex size-10 items-center justify-center text-primary', className)}>
      {children}
    </div>
  )
}

/** Info callout ("Exact requirements may vary…"). */
export function InfoNote({
  children,
  icon,
  className,
}: {
  children: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        cardClass,
        'flex items-start gap-3 p-3 text-sm leading-snug text-muted',
        className,
      )}
    >
      <span className="mt-0.5 shrink-0 text-primary">
        {icon ?? <Info className="size-5" strokeWidth={1.75} aria-hidden />}
      </span>
      <div>{children}</div>
    </div>
  )
}
