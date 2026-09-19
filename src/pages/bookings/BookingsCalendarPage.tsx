import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { addMonths, format, parseISO, subMonths } from 'date-fns'
import { CalendarX2 } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { calendarPill } from '@/components/domain/bookingStatus'
import {
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  ListSkeleton,
  MonthNav,
  ScreenTitle,
  SectionLabel,
  StatusPill,
  Thumbnail,
  WeekStrip,
} from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/format'
import { useMyBookings } from '@/data/hooks'
import type { BookingView } from '@/data/types'

const HIDDEN = ['declined', 'cancelled']

function BookingCard({ b, day }: { b: BookingView; day: string }) {
  const to = ['in_transit', 'on_site', 'return_scheduled'].includes(b.status)
    ? `/hires/${b.id}`
    : `/bookings/${b.id}`
  return (
    <Link to={to} className={cn(cardClass, 'flex gap-3 p-2.5 hover:border-line-input')}>
      <Thumbnail
        src={b.machine.photos[0]?.replace('.webp', '-sm.webp')}
        alt={b.machine.title}
        className="h-[88px] w-[96px]"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">{b.machine.title}</p>
        <p className="text-sm text-[#dae4ef]">
          {formatTime(b.startTime)} – {formatTime(b.endTime)}
        </p>
        <p className="truncate text-sm text-muted">{b.supplier.name}</p>
        <StatusPill {...calendarPill(b, day)} className="mt-1" />
      </div>
    </Link>
  )
}

/** Board 05 · Bookings Calendar */
export function BookingsCalendarPage() {
  const bookings = useMyBookings()
  const [day, setDay] = useState(new Date())
  const key = format(day, 'yyyy-MM-dd')
  const visible = useMemo(
    () => (bookings.data ?? []).filter((b) => !HIDDEN.includes(b.status)),
    [bookings.data],
  )
  const onDay = visible.filter((b) => b.startDate <= key && b.endDate >= key)
  const upcoming = visible.filter((b) => b.startDate > key).slice(0, 5)
  const marked = useMemo(() => visible.flatMap((b) => [parseISO(b.startDate)]), [visible])

  return (
    <AppScreen
      root
      footer={
        <ButtonLink to="/browse" arrow>
          New Booking
        </ButtonLink>
      }
    >
      <ScreenTitle title="Bookings Calendar" subtitle="View and manage your equipment bookings." />
      <Card className="px-2 py-1">
        <MonthNav
          month={day}
          onPrev={() => setDay((d) => subMonths(d, 1))}
          onNext={() => setDay((d) => addMonths(d, 1))}
        />
        <WeekStrip selected={day} onSelect={setDay} marked={marked} className="pb-2" />
      </Card>
      <SectionLabel>{format(day, 'EEEE d MMMM')}</SectionLabel>
      <div className="space-y-2.5">
        {bookings.isPending && <ListSkeleton rows={3} />}
        {bookings.isError && <ErrorState onRetry={() => void bookings.refetch()} />}
        {bookings.data && onDay.length === 0 && (
          <EmptyState
            icon={<CalendarX2 strokeWidth={1.75} />}
            title="No bookings this day"
            description="Pick another day or book equipment."
          />
        )}
        {onDay.map((b) => (
          <BookingCard key={b.id} b={b} day={key} />
        ))}
      </div>
      {upcoming.length > 0 && (
        <>
          <SectionLabel>Coming up</SectionLabel>
          <div className="space-y-2.5">
            {upcoming.map((b) => (
              <BookingCard key={b.id} b={b} day={key} />
            ))}
          </div>
        </>
      )}
    </AppScreen>
  )
}
