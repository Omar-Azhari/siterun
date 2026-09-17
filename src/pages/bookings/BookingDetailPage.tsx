import { useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, CircleDollarSign, MapPin, MessageSquareText, ShieldCheck, Truck } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { MachineSummary, SupplierRow } from '@/components/domain/MachineBits'
import { basePill, DELIVERY_LABEL } from '@/components/domain/bookingStatus'
import { Button, ButtonLink, Card, CopyButton, EmptyState, ErrorState, ListSkeleton, ScreenTitle, StatusPill } from '@/components/ui'
import { formatDateLong, formatMoney } from '@/lib/format'
import { gstOf } from '@/lib/booking'
import { useApiMutation, useBooking, useMe } from '@/data/hooks'
import { DetailLine } from './BookingConfirmedPage'

/** Contractor booking detail (reached from calendar, notifications and confirmation). */
export function BookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: me } = useMe()
  const booking = useBooking(id)
  const cancel = useApiMutation((api, bid: string) => api.cancelBooking(bid), { success: 'Booking cancelled' })
  const message = useApiMutation((api, bid: string) => api.openConversationForBooking(bid))
  const b = booking.data

  if (booking.isPending) return <AppScreen><ListSkeleton rows={3} /></AppScreen>
  if (booking.isError) return <AppScreen><ErrorState onRetry={() => void booking.refetch()} /></AppScreen>
  if (!b) return <AppScreen><EmptyState title="Booking not found" /></AppScreen>

  const active = ['in_transit', 'on_site', 'return_scheduled'].includes(b.status)
  const canChange = me?.role !== 'viewer'

  return (
    <AppScreen
      footer={
        <>
          {active && (
            <ButtonLink to={`/hires/${b.id}`} arrow>
              Manage Hire
            </ButtonLink>
          )}
          <Button
            variant="secondary"
            size="md"
            block
            leftIcon={<MessageSquareText className="size-5 text-primary" />}
            loading={message.isPending}
            onClick={() => message.mutate(b.id, { onSuccess: (cid) => navigate(`/messages/${cid}`) })}
          >
            Message {b.supplier.name}
          </Button>
          {canChange && ['requested', 'confirmed'].includes(b.status) && (
            <Button
              variant="danger"
              size="md"
              block
              loading={cancel.isPending}
              onClick={() => {
                if (window.confirm(`Cancel booking ${b.ref}?`)) cancel.mutate(b.id)
              }}
            >
              Cancel Booking
            </Button>
          )}
        </>
      }
    >
      <div className="flex items-start justify-between">
        <ScreenTitle title="Booking Details" subtitle={b.site ? `${b.site.name}, ${b.site.suburb}` : undefined} />
        <StatusPill {...basePill(b.status, b.startDate)} className="mt-1.5" />
      </div>
      <Card className="flex items-center justify-between py-3">
        <div>
          <p className="text-[13px] text-[#dae4ef]">Booking ID</p>
          <p className="font-display text-xl font-bold">{b.ref}</p>
        </div>
        <CopyButton value={b.ref} label="Copy booking ID" />
      </Card>
      <MachineSummary machine={b.machine} to={`/machines/${b.machine.id}`} className="mt-2.5" />
      <Card className="mt-2.5 space-y-3">
        <DetailLine icon={<CalendarDays />} label="Hire period">
          {formatDateLong(b.startDate)} – {formatDateLong(b.endDate)} ({b.days} days)
        </DetailLine>
        <DetailLine icon={<Truck />} label={DELIVERY_LABEL[b.delivery]}>
          {b.delivery === 'pickup' ? `Supplier yard, ${b.machine.suburb} ${b.machine.state}` : b.deliveryAddress}
        </DetailLine>
        {b.site && (
          <DetailLine icon={<MapPin />} label="Site">
            {b.site.name}
          </DetailLine>
        )}
        <DetailLine icon={<ShieldCheck />} label="Insurance">
          {b.insurance ? 'Included' : 'Not included'}
        </DetailLine>
        <DetailLine icon={<CircleDollarSign />} label="Cost">
          <span className="block">
            {b.quantity > 1 ? `${b.quantity} × ` : ''}
            {formatMoney(b.dailyRate)}/day · {b.hireType === 'wet' ? 'Wet hire' : 'Dry hire'}
          </span>
          <span className="block text-fg">
            {formatMoney(b.totalCents)} ex. GST · {formatMoney(b.totalCents + gstOf(b.totalCents), { cents: true })} inc. GST
          </span>
        </DetailLine>
        {b.declineReason && <p className="rounded-lg bg-danger/10 px-3 py-2 text-[13px] text-[#fca5a5]">Declined: {b.declineReason}</p>}
      </Card>
      <SupplierRow machine={b.machine} className="mt-2.5" />
    </AppScreen>
  )
}
