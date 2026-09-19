import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Building2,
  CalendarDays,
  ChevronRight,
  DollarSign,
  MapPin,
  MessageSquareText,
  Navigation,
  Repeat2,
  Truck,
} from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { hirePill } from '@/components/domain/bookingStatus'
import { Button, ButtonLink, StatusPill } from '@/components/ui'
import { formatDateLong, formatMoney } from '@/lib/format'
import { useApiMutation, useMe } from '@/data/hooks'
import { HireGate } from './HireGate'
import { isLive, useHire } from './hireShared'
import { PhotoCarousel } from '../browse/MachineDetailPage'

function Row({
  icon,
  label,
  children,
  to,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  to?: string
  onClick?: () => void
}) {
  const body = (
    <>
      <span className="mt-0.5 text-primary [&_svg]:size-6">{icon}</span>
      <span className="flex-1 text-[15px]">
        <span className="block text-sm text-muted">{label}</span>
        {children}
      </span>
      {(to || onClick) && <ChevronRight className="size-5 self-center text-muted" aria-hidden />}
    </>
  )
  const cls = 'flex w-full gap-3 border-b border-line py-3 text-left last:border-0'
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

/** Board 04 · Active Hire Detail */
export function HireDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: me } = useMe()
  const { q, b, state } = useHire(id)
  const message = useApiMutation((api, bid: string) => api.openConversationForBooking(bid))
  if (!b) return <HireGate state={state} retry={() => void q.refetch()} />

  const canChange = me?.role !== 'viewer' && isLive(b)
  const onSite = b.status === 'on_site' || b.status === 'return_scheduled'

  return (
    <AppScreen
      footer={
        canChange ? (
          <>
            {b.status === 'in_transit' && (
              <ButtonLink
                to={`/hires/${b.id}/tracking`}
                arrow
                leftIcon={<Navigation className="size-5" />}
              >
                Track Delivery
              </ButtonLink>
            )}
            <ButtonLink
              to={`/hires/${b.id}/extend`}
              arrow
              variant={b.status === 'in_transit' ? 'secondary' : 'primary'}
            >
              Extend Hire
            </ButtonLink>
            {onSite && (
              <ButtonLink to={`/hires/${b.id}/return`} variant="secondary">
                {b.status === 'return_scheduled' ? 'Change Return' : 'Schedule Return'}
              </ButtonLink>
            )}
            <ButtonLink
              to={`/hires/${b.id}/swap`}
              variant="secondary"
              leftIcon={<Repeat2 className="size-6 text-primary" />}
            >
              Smart Swap
            </ButtonLink>
          </>
        ) : undefined
      }
    >
      <PhotoCarousel
        photos={b.machine.photos}
        alt={b.machine.title}
        overlay={
          <StatusPill
            {...hirePill(b)}
            size="md"
            className="absolute top-3 right-3 bg-app/80 backdrop-blur"
          />
        }
      />
      <h1 className="mt-3 font-display text-[26px] font-bold">{b.machine.title}</h1>
      <p className="text-[15px] text-muted">
        {b.machine.make} {b.machine.model} · {b.ref}
      </p>
      <div className="mt-2">
        <Row
          icon={<Building2 strokeWidth={1.5} />}
          label="Supplier"
          onClick={() => message.mutate(b.id, { onSuccess: (cid) => navigate(`/messages/${cid}`) })}
        >
          <span className="flex items-center gap-2">
            {b.supplier.name}
            <MessageSquareText className="size-4 text-primary" aria-label="Message supplier" />
          </span>
        </Row>
        <Row icon={<CalendarDays strokeWidth={1.5} />} label="Hire Period">
          {formatDateLong(b.startDate)}
          <br />– {formatDateLong(b.endDate)} ({b.days} days)
        </Row>
        <Row
          icon={<MapPin strokeWidth={1.5} />}
          label="Site"
          to={b.site ? `/sites/${b.site.id}` : undefined}
        >
          {b.site?.name}
          <br />
          {b.site?.suburb}, {b.site?.state}
        </Row>
        <Row icon={<DollarSign strokeWidth={1.5} />} label="Rate">
          {formatMoney(b.dailyRate)} / day
          <br />
          <span className="text-sm text-muted">(ex. GST) · {formatMoney(b.totalCents)} total</span>
        </Row>
        {b.collection && (
          <Row icon={<Truck strokeWidth={1.5} />} label="Collection booked">
            {formatDateLong(b.collection.date)},{' '}
            {b.collection.slot === 'morning' ? '7:00 AM – 12:00 PM' : '12:00 PM – 5:00 PM'}
          </Row>
        )}
      </div>
      {!isLive(b) && (
        <p className="mt-3 text-sm text-muted">
          This hire is {b.status.replace('_', ' ')}.{' '}
          <Button
            variant="ghost"
            size="sm"
            block={false}
            onClick={() => navigate(`/bookings/${b.id}`)}
          >
            View booking
          </Button>
        </p>
      )}
    </AppScreen>
  )
}
