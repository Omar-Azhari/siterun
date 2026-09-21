import { thumb } from '@/lib/images'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addDays, addMonths, format, parseISO, subMonths } from 'date-fns'
import {
  CalendarDays,
  CircleDollarSign,
  Inbox,
  MapPin,
  MessageSquareText,
  Phone,
  Truck,
  User,
} from 'lucide-react'
import { LiveLocationCard } from '@/components/domain/LiveLocationCard'
import { AppScreen } from '@/components/layout/AppScreen'
import { dispatchPill } from '@/components/domain/bookingStatus'
import {
  BottomSheet,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  ListSkeleton,
  MonthNav,
  ScreenTitle,
  SegmentedTabs,
  StatusPill,
  Textarea,
  Thumbnail,
  WeekStrip,
} from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { selectedClass } from '@/components/ui/SelectableCard'
import { cn } from '@/lib/cn'
import { formatDateLong, formatMoney } from '@/lib/format'
import { useApiMutation, useBooking, useSupplierBookings } from '@/data/hooks'
import type { BookingView } from '@/data/types'
import { PhotoCarousel } from '@/pages/browse/MachineDetailPage'

const ACCEPTED = ['confirmed', 'in_transit', 'on_site', 'return_scheduled']
const PAST = ['completed', 'declined', 'cancelled']
const range = (b: BookingView) =>
  `${format(parseISO(b.startDate), 'd MMM yyyy')} – ${format(parseISO(b.endDate), 'd MMM yyyy')}`

/** Decline with an optional reason, shared by the request list and detail screen. */
function useRespond() {
  const [declining, setDeclining] = useState<BookingView | null>(null)
  const [reason, setReason] = useState('')
  const respond = useApiMutation(
    (api, v: { id: string; accept: boolean; reason?: string }) =>
      api.respondToBooking(v.id, v.accept, v.reason),
    {
      success: (b) =>
        b.status === 'confirmed' ? `Booking ${b.ref} accepted` : `Booking ${b.ref} declined`,
    },
  )
  const sheet = (
    <BottomSheet
      open={!!declining}
      onClose={() => setDeclining(null)}
      title="Decline booking"
      footer={
        <Button
          variant="danger"
          loading={respond.isPending}
          onClick={() =>
            declining &&
            respond.mutate(
              { id: declining.id, accept: false, reason },
              {
                onSuccess: () => {
                  setDeclining(null)
                  setReason('')
                },
              },
            )
          }
        >
          Decline Booking
        </Button>
      }
    >
      <p className="mb-3 text-sm text-muted">
        {declining?.contractor.name} will be notified. Let them know why so they can find another
        machine.
      </p>
      <Textarea
        label="Reason (optional)"
        rows={3}
        maxLength={250}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Machine unavailable for those dates."
      />
    </BottomSheet>
  )
  return { respond, setDeclining, sheet }
}

/** Board 09 · Booking Requests */
export function BookingRequestsPage() {
  const bookings = useSupplierBookings()
  const [tab, setTab] = useState<'new' | 'accepted' | 'past'>('new')
  const { respond, setDeclining, sheet } = useRespond()
  const all = bookings.data ?? []
  const groups = {
    new: all
      .filter((b) => b.status === 'requested')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    accepted: all.filter((b) => ACCEPTED.includes(b.status)),
    past: all
      .filter((b) => PAST.includes(b.status))
      .sort((a, b) => b.endDate.localeCompare(a.endDate)),
  }
  const list = groups[tab]

  return (
    <AppScreen root>
      <ScreenTitle title="Booking Requests" subtitle="Review and respond to new hire requests." />
      <SegmentedTabs
        label="Requests"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'new', label: 'New', count: groups.new.length },
          { value: 'accepted', label: 'Accepted', count: groups.accepted.length },
          { value: 'past', label: 'Past', count: groups.past.length },
        ]}
      />
      <div className="mt-3 space-y-2.5" role="tabpanel">
        {bookings.isPending && <ListSkeleton rows={3} />}
        {bookings.isError && <ErrorState onRetry={() => void bookings.refetch()} />}
        {bookings.data && list.length === 0 && (
          <EmptyState
            icon={<Inbox strokeWidth={1.75} />}
            title={tab === 'new' ? 'No new requests' : 'Nothing here yet'}
            description="New booking requests will appear here."
          />
        )}
        {list.map((b) => (
          <Card key={b.id} className="p-3">
            <Link to={`/supplier/bookings/${b.id}`} className="flex items-center gap-3">
              <Thumbnail
                src={b.site?.photoUrl ?? b.machine.photos[0]}
                alt=""
                className="h-14 w-20"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold">{b.contractor.name}</span>
                <span className="block truncate text-sm text-muted">
                  {b.site?.name ?? b.machine.title}
                </span>
              </span>
              {tab !== 'new' && <StatusPill {...dispatchPill(b)} />}
            </Link>
            <div className="mt-2.5 space-y-1 text-sm text-[#dae4ef]">
              <p className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted" aria-hidden />
                {range(b)}
              </p>
              <p className="flex items-center gap-2 pl-6 text-muted">
                {b.days} days · {b.machine.title}
              </p>
              <p className="flex items-center gap-2">
                <CircleDollarSign className="size-4 text-muted" aria-hidden />
                {formatMoney(b.dailyRate)} / day <span className="text-muted">(ex. GST)</span>
              </p>
            </div>
            {tab === 'new' && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="danger" size="md" block onClick={() => setDeclining(b)}>
                  Decline
                </Button>
                <Button
                  size="md"
                  block
                  loading={respond.isPending && respond.variables?.id === b.id}
                  onClick={() => respond.mutate({ id: b.id, accept: true })}
                >
                  Accept
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
      {sheet}
    </AppScreen>
  )
}

/** Board 09 · Bookings & Dispatch */
export function DispatchPage() {
  const bookings = useSupplierBookings()
  const [day, setDay] = useState(new Date())
  const [plan, setPlan] = useState(false)
  const advance = useApiMutation(
    (api, v: { id: string; to: 'in_transit' | 'on_site' | 'completed' }) =>
      api.advanceBooking(v.id, v.to),
    {
      success: (b) =>
        b.status === 'in_transit'
          ? 'Marked as dispatched'
          : b.status === 'on_site'
            ? 'Marked as delivered'
            : 'Hire completed and invoiced',
    },
  )
  const key = format(day, 'yyyy-MM-dd')
  const active = useMemo(
    () => (bookings.data ?? []).filter((b) => ACCEPTED.includes(b.status)),
    [bookings.data],
  )
  const list = active
    .filter((b) => b.endDate >= key)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
  const marked = useMemo(() => active.map((b) => parseISO(b.startDate)), [active])
  const today = format(new Date(), 'yyyy-MM-dd')
  const soon = format(addDays(new Date(), 7), 'yyyy-MM-dd')
  const dispatchList = active.filter(
    (b) =>
      (b.status === 'confirmed' && b.startDate <= soon) ||
      b.status === 'in_transit' ||
      (b.status === 'return_scheduled' && (b.collection?.date ?? b.endDate) <= soon),
  )

  return (
    <AppScreen
      root
      footer={
        <>
          <ButtonLink to="/supplier/bookings" arrow>
            View All Bookings
          </ButtonLink>
          <Button
            variant="secondary"
            arrow
            leftIcon={<Truck className="size-6 text-primary" />}
            onClick={() => setPlan(true)}
          >
            Plan Dispatch
          </Button>
        </>
      }
    >
      <ScreenTitle
        title="Bookings & Dispatch"
        subtitle="Manage confirmed hires and plan your dispatch."
      />
      <MonthNav
        month={day}
        onPrev={() => setDay((d) => subMonths(d, 1))}
        onNext={() => setDay((d) => addMonths(d, 1))}
      />
      <WeekStrip selected={day} onSelect={setDay} marked={marked} />
      <div className="mt-3 space-y-2.5">
        {bookings.isPending && <ListSkeleton rows={3} thumb={false} />}
        {bookings.data && list.length === 0 && (
          <EmptyState
            title="No hires from this date"
            description="Accepted bookings will show here."
          />
        )}
        {list.slice(0, 6).map((b) => {
          const covering = b.startDate <= key && b.endDate >= key
          return (
            <Link
              key={b.id}
              to={`/supplier/bookings/${b.id}`}
              className={cn(
                cardClass,
                'relative flex items-start gap-3 p-3 pl-4 hover:border-line-input',
                covering && selectedClass,
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'mt-1.5 size-3 shrink-0 rounded-full',
                  covering ? 'bg-success' : 'bg-[#93c5fd]',
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold">
                  {format(parseISO(b.startDate), 'd')}
                  {b.startDate.slice(0, 7) !== b.endDate.slice(0, 7)
                    ? ` ${format(parseISO(b.startDate), 'MMM')}`
                    : ''}{' '}
                  – {format(parseISO(b.endDate), 'd MMM')}
                </span>
                <span className="block text-sm text-[#dae4ef]">{b.contractor.name}</span>
                <span className="block text-sm text-muted">{b.machine.title}</span>
              </span>
              <StatusPill {...dispatchPill(b)} size="md" />
            </Link>
          )
        })}
      </div>

      <BottomSheet open={plan} onClose={() => setPlan(false)} title="Plan Dispatch">
        <p className="mb-3 text-sm text-muted">Deliveries and collections for the next 7 days.</p>
        {dispatchList.length === 0 && (
          <p className="text-sm text-muted">Nothing to dispatch this week.</p>
        )}
        <ul className="space-y-2">
          {dispatchList.map((b) => (
            <li key={b.id} className={cn(cardClass, 'p-3')}>
              <p className="font-semibold">
                {b.machine.title} → {b.site?.name ?? b.contractor.name}
              </p>
              <p className="text-sm text-muted">
                {b.status === 'return_scheduled'
                  ? `Collect ${formatDateLong(b.collection?.date ?? b.endDate)}, ${b.collection?.slot ?? 'morning'}`
                  : `${b.delivery === 'pickup' ? 'Customer pickup' : 'Deliver'} ${b.startDate <= today ? 'today' : formatDateLong(b.startDate)} · ${b.deliveryAddress}`}
              </p>
              <div className="mt-2">
                {b.status === 'confirmed' && b.delivery === 'delivery' && (
                  <Button
                    size="sm"
                    block
                    loading={advance.isPending && advance.variables?.id === b.id}
                    onClick={() => advance.mutate({ id: b.id, to: 'in_transit' })}
                  >
                    Mark Dispatched
                  </Button>
                )}
                {(b.status === 'in_transit' ||
                  (b.status === 'confirmed' && b.delivery === 'pickup')) && (
                  <Button
                    size="sm"
                    block
                    loading={advance.isPending && advance.variables?.id === b.id}
                    onClick={() => advance.mutate({ id: b.id, to: 'on_site' })}
                  >
                    {b.delivery === 'pickup' ? 'Mark Picked Up' : 'Mark Delivered'}
                  </Button>
                )}
                {b.status === 'return_scheduled' && (
                  <Button
                    size="sm"
                    block
                    loading={advance.isPending && advance.variables?.id === b.id}
                    onClick={() => advance.mutate({ id: b.id, to: 'completed' })}
                  >
                    Mark Collected
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </AppScreen>
  )
}

/** Supplier › all bookings */
export function SupplierBookingsListPage() {
  const bookings = useSupplierBookings()
  const [tab, setTab] = useState<'upcoming' | 'active' | 'past'>('active')
  const today = format(new Date(), 'yyyy-MM-dd')
  const all = bookings.data ?? []
  const groups = {
    active: all.filter((b) => ['in_transit', 'on_site', 'return_scheduled'].includes(b.status)),
    upcoming: all.filter(
      (b) => b.status === 'requested' || (b.status === 'confirmed' && b.endDate >= today),
    ),
    past: all
      .filter((b) => PAST.includes(b.status))
      .sort((a, b) => b.endDate.localeCompare(a.endDate)),
  }
  return (
    <AppScreen>
      <ScreenTitle title="All Bookings" subtitle="Every hire across your fleet." />
      <SegmentedTabs
        label="Bookings"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'active', label: 'On Hire', count: groups.active.length },
          { value: 'upcoming', label: 'Upcoming', count: groups.upcoming.length },
          { value: 'past', label: 'Past', count: groups.past.length },
        ]}
      />
      <div className="mt-3 space-y-2">
        {bookings.isPending && <ListSkeleton rows={4} />}
        {groups[tab].map((b) => (
          <Link
            key={b.id}
            to={`/supplier/bookings/${b.id}`}
            className={cn(cardClass, 'flex items-center gap-3 p-2.5 hover:border-line-input')}
          >
            <Thumbnail src={thumb(b.machine.photos[0])} alt="" className="size-14" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{b.machine.title}</span>
              <span className="block truncate text-sm text-muted">
                {b.contractor.name} · {range(b)}
              </span>
            </span>
            <StatusPill
              {...(b.status === 'requested'
                ? { label: 'New', tone: 'warning' as const, mark: 'dot' as const }
                : dispatchPill(b))}
            />
          </Link>
        ))}
        {bookings.data && groups[tab].length === 0 && <EmptyState title="No bookings" />}
      </div>
    </AppScreen>
  )
}

function Line({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3 border-b border-line py-3 last:border-0">
      <span className="mt-0.5 text-primary [&_svg]:size-6 [&_svg]:stroke-[1.5]">{icon}</span>
      <div className="min-w-0 flex-1 text-[15px]">
        <p className="text-sm text-muted">{label}</p>
        {children}
      </div>
    </div>
  )
}

/** Board 10 · Booking Detail (supplier) */
export function SupplierBookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const q = useBooking(id)
  const b = q.data
  const { respond, setDeclining, sheet } = useRespond()
  const advance = useApiMutation(
    (api, to: 'in_transit' | 'on_site' | 'completed') => api.advanceBooking(id ?? '', to),
    { success: 'Booking updated' },
  )
  const message = useApiMutation((api, bid: string) => api.openConversationForBooking(bid))
  if (q.isPending)
    return (
      <AppScreen>
        <ListSkeleton rows={4} />
      </AppScreen>
    )
  if (q.isError)
    return (
      <AppScreen>
        <ErrorState onRetry={() => void q.refetch()} />
      </AppScreen>
    )
  if (!b)
    return (
      <AppScreen>
        <EmptyState title="Booking not found" />
      </AppScreen>
    )

  const pill =
    b.status === 'requested'
      ? { label: 'New Request', tone: 'warning' as const, mark: 'dot' as const }
      : dispatchPill(b)
  const footer =
    b.status === 'requested' ? (
      <div className="grid grid-cols-2 gap-2">
        <Button variant="danger" size="md" block onClick={() => setDeclining(b)}>
          Decline
        </Button>
        <Button
          size="md"
          block
          loading={respond.isPending}
          onClick={() => respond.mutate({ id: b.id, accept: true })}
        >
          Accept
        </Button>
      </div>
    ) : b.status === 'confirmed' ? (
      <Button
        arrow
        loading={advance.isPending}
        onClick={() => advance.mutate(b.delivery === 'pickup' ? 'on_site' : 'in_transit')}
      >
        {b.delivery === 'pickup' ? 'Mark Picked Up' : 'Mark Dispatched'}
      </Button>
    ) : b.status === 'in_transit' ? (
      <Button arrow loading={advance.isPending} onClick={() => advance.mutate('on_site')}>
        Mark Delivered
      </Button>
    ) : ['on_site', 'return_scheduled'].includes(b.status) ? (
      <Button arrow loading={advance.isPending} onClick={() => advance.mutate('completed')}>
        Mark Collected &amp; Invoice
      </Button>
    ) : undefined

  return (
    <AppScreen footer={footer}>
      <h1 className="font-display text-[26px] font-bold">Booking Detail</h1>
      <p className="mb-3 text-[15px] text-muted">
        Review customer request and booking information.
      </p>
      <div className="mb-2 flex items-center justify-between">
        <StatusPill {...pill} size="md" />
        <span className="text-sm text-[#dae4ef]">#{b.ref}</span>
      </div>
      <div className="overflow-hidden rounded-[14px] [&>div]:mx-0">
        <PhotoCarousel photos={b.machine.photos} alt={b.machine.title} />
      </div>
      <p className="mt-3 font-display text-2xl font-bold">{b.machine.title}</p>
      <p className="text-muted">
        {b.machine.make} {b.machine.model}
      </p>
      <div className="mt-2">
        <Line icon={<User />} label="Customer">
          <div className="flex items-center justify-between gap-3">
            <span>
              <span className="block font-medium">{b.contractor.name}</span>
              <span className="text-[#dae4ef]">{b.contactName}</span>
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                aria-label={`Message ${b.contractor.name}`}
                onClick={() =>
                  message.mutate(b.id, { onSuccess: (cid) => navigate(`/messages/${cid}`) })
                }
                className="flex size-11 items-center justify-center rounded-xl border border-primary text-primary hover:bg-primary/10"
              >
                <MessageSquareText className="size-5" />
              </button>
              <a
                href={`tel:${b.contactPhone.replace(/\s/g, '')}`}
                aria-label={`Call ${b.contactName}`}
                className="flex size-11 items-center justify-center rounded-xl border border-primary text-primary hover:bg-primary/10"
              >
                <Phone className="size-5" />
              </a>
            </span>
          </div>
        </Line>
        <Line icon={<CalendarDays />} label="Hire Period">
          {format(parseISO(b.startDate), 'EEE, d MMM yyyy')} –{' '}
          {format(parseISO(b.endDate), 'EEE, d MMM yyyy')} ({b.days} days)
        </Line>
        <Line
          icon={<MapPin />}
          label={b.delivery === 'pickup' ? 'Customer pickup' : 'Delivery Address'}
        >
          {b.delivery === 'pickup' ? `From your yard in ${b.machine.suburb}` : b.deliveryAddress}
        </Line>
        <Line icon={<CircleDollarSign />} label="Value">
          {formatMoney(b.dailyRate)}/day · {b.hireType === 'wet' ? 'Wet hire' : 'Dry hire'} ·{' '}
          {formatMoney(b.totalCents)} ex. GST
        </Line>
        {b.customerMessage && (
          <Line icon={<MessageSquareText />} label="Customer Message">
            “{b.customerMessage}”
          </Line>
        )}
        {b.collection && (
          <Line icon={<Truck />} label="Collection requested">
            {formatDateLong(b.collection.date)}, {b.collection.slot}
            {b.collection.notes && (
              <span className="block text-sm text-muted">{b.collection.notes}</span>
            )}
          </Line>
        )}
      </div>
      {b.status === 'in_transit' && b.delivery === 'delivery' && (
        <LiveLocationCard bookingId={b.id} />
      )}
      {sheet}
    </AppScreen>
  )
}
