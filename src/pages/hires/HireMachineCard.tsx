import { thumb } from '@/lib/images'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { hirePill } from '@/components/domain/bookingStatus'
import { StatusPill, Thumbnail } from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import type { BookingView } from '@/data/types'

/** Machine card at the top of the hire sub-screens (board 04). */
export function HireMachineCard({
  b,
  extra,
  to,
}: {
  b: BookingView
  extra?: ReactNode
  to?: string
}) {
  const body = (
    <>
      <Thumbnail
        src={thumb(b.machine.photos[0])}
        alt={b.machine.title}
        className="h-[76px] w-[92px]"
      />
      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-base font-semibold">{b.machine.title}</p>
        <p className="truncate text-sm text-muted">
          {b.machine.make} {b.machine.model}
        </p>
        <StatusPill {...hirePill(b)} className="mt-1" />
      </div>
      {/* On a 360px phone the arrival time has no room beside the title, so it and the
          chevron drop onto their own line instead of squeezing the machine name away. */}
      {(extra || to) && (
        <div className="ml-auto flex items-center gap-2 self-center max-[389px]:w-full max-[389px]:justify-end">
          {extra}
          {to && <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />}
        </div>
      )}
    </>
  )
  const cls = cn(cardClass, 'flex flex-wrap items-start gap-x-3 gap-y-1.5 p-2.5')
  return to ? (
    <Link to={to} className={cn(cls, 'hover:border-line-input')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
