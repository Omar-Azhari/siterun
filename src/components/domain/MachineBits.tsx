import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, MapPin, ShieldCheck, Star } from 'lucide-react'
import { BottomSheet, Price, StatusPill, Thumbnail } from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import type { Machine } from '@/data/types'
import { Logo } from '@/components/brand/Logo'

/** Search result card (board 03 screen 3). */
export function MachineCard({ machine, to, available = true }: { machine: Machine; to: string; available?: boolean }) {
  return (
    <Link to={to} className={cn(cardClass, 'flex items-center gap-3 p-2.5 transition-colors hover:border-line-input')}>
      <Thumbnail src={machine.photos[0]?.replace('.webp', '-sm.webp')} alt={machine.title} className="h-[92px] w-[88px] shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{machine.title}</p>
        <p className="truncate text-[13px] text-muted">
          {machine.make} {machine.model}
        </p>
        <Price cents={machine.rates.daily} className="mt-1 block" />
        {available && <StatusPill status="available" className="mt-1" />}
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
    </Link>
  )
}

/** Machine thumbnail + title + price (board 03 screen 5, board 04 cards). */
export function MachineSummary({
  machine,
  to,
  trailing,
  price = true,
  className,
}: {
  machine: Machine
  to?: string
  trailing?: React.ReactNode
  price?: boolean
  className?: string
}) {
  const body = (
    <>
      <Thumbnail src={machine.photos[0]?.replace('.webp', '-sm.webp')} alt={machine.title} className="h-[70px] w-[84px] shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{machine.title}</p>
        <p className="truncate text-[13px] text-muted">
          {machine.make} {machine.model}
        </p>
        {price && <Price cents={machine.rates.daily} className="mt-0.5 block" />}
        {trailing}
      </div>
      {to && <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />}
    </>
  )
  const cls = cn(cardClass, 'flex items-center gap-3 p-2.5', to && 'transition-colors hover:border-line-input', className)
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export function Rating({ value, count }: { value: number | null; count: number }) {
  if (value === null) return <span className="text-xs text-muted">New supplier</span>
  return (
    <span className="inline-flex items-center gap-1 text-[13px] text-[#dae4ef]">
      <Star className="size-3.5 fill-warning text-warning" aria-hidden />
      <span>
        {value.toFixed(1)} <span className="text-muted">({count} reviews)</span>
      </span>
    </span>
  )
}

/** Supplier logo tile. Suppliers don't upload logos yet, so we show a branded placeholder. */
export function SupplierLogo({ className }: { className?: string }) {
  return (
    <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-lg bg-white', className)}>
      <Logo variant="mark" tone="light" className="h-6" title="" />
    </span>
  )
}

/** Tappable supplier row that opens a details sheet (board 03). */
export function SupplierRow({ machine, className }: { machine: Machine; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn(cardClass, 'flex w-full items-center gap-3 p-2.5 text-left hover:border-line-input', className)}>
        <SupplierLogo />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{machine.supplierName}</span>
          <Rating value={machine.supplierRating} count={machine.supplierReviews} />
        </span>
        <ChevronRight className="size-5 text-muted" aria-hidden />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={machine.supplierName}>
        <div className="space-y-3 text-sm">
          <Rating value={machine.supplierRating} count={machine.supplierReviews} />
          <p className="flex items-center gap-2 text-[#dae4ef]">
            <MapPin className="size-4 text-primary" aria-hidden />
            Yard in {machine.suburb}, {machine.state} · delivers within {machine.serviceRadiusKm} km
          </p>
          <p className="flex items-center gap-2 text-[#dae4ef]">
            <ShieldCheck className="size-4 text-success" aria-hidden />
            Insurance, registration and service records verified by SiteRun
          </p>
          <p className="text-muted">You can message the supplier once you’ve sent a booking request.</p>
        </div>
      </BottomSheet>
    </>
  )
}
