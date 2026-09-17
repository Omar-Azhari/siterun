import { useParams } from 'react-router-dom'
import { CalendarDays, CircleDollarSign, Settings, ShieldCheck, Truck } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { MachineSummary, SupplierRow } from '@/components/domain/MachineBits'
import { basePill, DELIVERY_LABEL } from '@/components/domain/bookingStatus'
import { ButtonLink, Card, CopyButton, EmptyState, ErrorState, ListSkeleton, StatusPill, SuccessState } from '@/components/ui'
import { formatDateLong, formatMoney } from '@/lib/format'
import { useBooking } from '@/data/hooks'

export function DetailLine({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-primary [&_svg]:size-5">{icon}</span>
      <div className="text-sm">
        <p className="text-[#dae4ef]">{label}</p>
        <div className="text-muted">{children}</div>
      </div>
    </div>
  )
}

/** Board 03 · Booking Confirmed */
export function BookingConfirmedPage() {
  const { id } = useParams()
  const booking = useBooking(id)
  const b = booking.data

  if (booking.isPending) return <AppScreen hideNav><ListSkeleton rows={3} /></AppScreen>
  if (booking.isError) return <AppScreen hideNav><ErrorState onRetry={() => void booking.refetch()} /></AppScreen>
  if (!b) return <AppScreen hideNav><EmptyState title="Booking not found" /></AppScreen>

  const confirmed = b.status !== 'requested' && b.status !== 'declined' && b.status !== 'cancelled'
  const title = b.status === 'requested' ? 'Booking Requested!' : b.status === 'declined' ? 'Booking Declined' : 'Booking Confirmed!'
  const description =
    b.status === 'requested'
      ? `Your request has been sent to ${b.supplier.name}. We’ll notify you as soon as they confirm.`
      : b.status === 'declined'
        ? (b.declineReason ?? 'The supplier couldn’t take this booking.')
        : 'Your equipment is booked and a confirmation has been sent to your email.'
  const manageTo = ['in_transit', 'on_site', 'return_scheduled'].includes(b.status) ? `/hires/${b.id}` : `/bookings/${b.id}`

  return (
    <AppScreen
      hideNav
      footer={
        <>
          <ButtonLink to={`/bookings/${b.id}`} arrow>
            View Booking
          </ButtonLink>
          <ButtonLink to={manageTo} variant="secondary" size="md" block leftIcon={<Settings className="size-5 text-primary" />}>
            Manage Booking
          </ButtonLink>
        </>
      }
    >
      {confirmed || b.status === 'requested' ? (
        <SuccessState title={title} description={description} />
      ) : (
        <div className="py-6 text-center">
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted">{description}</p>
        </div>
      )}
      <Card className="mt-4 flex items-center justify-between py-3">
        <div>
          <p className="text-[13px] text-[#dae4ef]">Booking ID</p>
          <p className="font-display text-2xl font-bold tracking-tight">{b.ref}</p>
        </div>
        <CopyButton value={b.ref} label="Copy booking ID" />
      </Card>
      <Card className="mt-2.5 space-y-3 p-2.5">
        <MachineSummary
          machine={b.machine}
          price={false}
          className="border-0 bg-none p-0"
          trailing={<StatusPill {...(b.status === 'confirmed' ? { status: 'booking_confirmed' as const } : basePill(b.status))} className="mt-1" />}
        />
        <div className="space-y-3 px-1 pb-1">
          <DetailLine icon={<CalendarDays />} label="Hire period">
            {formatDateLong(b.startDate)} – {formatDateLong(b.endDate)} ({b.days} days)
          </DetailLine>
          <DetailLine icon={<Truck />} label={b.delivery === 'pickup' ? 'Pickup' : 'Delivery'}>
            {b.delivery === 'pickup' ? `Supplier yard, ${b.machine.suburb} ${b.machine.state}` : b.deliveryAddress}
          </DetailLine>
          <DetailLine icon={<ShieldCheck />} label="Insurance">
            {b.insurance ? 'Included' : 'Not included'}
          </DetailLine>
          <DetailLine icon={<CircleDollarSign />} label="Total (ex. GST)">
            <span className="text-base font-bold text-fg">{formatMoney(b.totalCents)}</span>
          </DetailLine>
          <p className="sr-only">Delivery method: {DELIVERY_LABEL[b.delivery]}</p>
        </div>
      </Card>
      <SupplierRow machine={b.machine} className="mt-2.5" />
    </AppScreen>
  )
}
