import { Link, useNavigate, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { CalendarDays, ChevronRight, Clock, HardHat, MapPin, MessageSquareText, Navigation, Phone } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { dispatchPill } from '@/components/domain/bookingStatus'
import { BaseMap } from '@/components/domain/maps/MapParts'
import { pinIcon } from '@/components/domain/maps/mapUtils'
import { Button, Card, EmptyState, ErrorState, InfoNote, ListRow, ListSkeleton, ScreenTitle, SectionLabel, StatusPill, Thumbnail } from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { formatDate, formatDateLong, formatTime } from '@/lib/format'
import { useApiMutation, useBooking, useDocuments, useMe, useOperatorBookings, useRequirements } from '@/data/hooks'
import type { BookingView } from '@/data/types'
import { Marker } from 'react-leaflet'
import { StateIcon } from '../supplier/compliance/complianceShared'
import { docState, latestFor } from '../supplier/compliance/complianceUtils'

// The operator role has no designed screens. These follow the same patterns as boards 04 and 08.

function JobCard({ b }: { b: BookingView }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const onNow = b.startDate <= today && b.endDate >= today
  return (
    <Link to={`/operator/bookings/${b.id}`} className={cn(cardClass, 'flex gap-3 p-2.5 hover:border-line-input', onNow && 'border-primary')}>
      <Thumbnail src={b.machine.photos[0]?.replace('.webp', '-sm.webp')} alt="" className="h-20 w-24" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">{b.machine.title}</p>
        <p className="truncate text-sm text-[#dae4ef]">
          {b.site?.name} · {b.contractor.name}
        </p>
        <p className="text-sm text-muted">
          {format(parseISO(b.startDate), 'd MMM')} – {format(parseISO(b.endDate), 'd MMM')} · {formatTime(b.startTime)}
        </p>
        <StatusPill {...dispatchPill(b)} className="mt-1" />
      </div>
    </Link>
  )
}

function useOperatorDocs() {
  const { data: me } = useMe()
  const docs = useDocuments({ profileId: me?.profile.id }, !!me)
  const reqs = useRequirements()
  const rows = (reqs.data ?? []).filter((r) => r.group === 'operator').map((r) => ({ r, doc: latestFor(docs.data ?? [], r), state: docState(latestFor(docs.data ?? [], r)) }))
  return { rows, loading: docs.isPending || reqs.isPending, me }
}

export function OperatorHomePage() {
  const jobs = useOperatorBookings()
  const { rows, me } = useOperatorDocs()
  const today = format(new Date(), 'yyyy-MM-dd')
  const current = (jobs.data ?? []).filter((b) => b.startDate <= today && b.endDate >= today)
  const next = (jobs.data ?? []).filter((b) => b.startDate > today).slice(0, 3)
  const issues = rows.filter((x) => x.r.required && x.state !== 'verified')

  return (
    <AppScreen root>
      <ScreenTitle title={`G’day, ${me?.profile.fullName.split(' ')[0] ?? ''}`} subtitle={`${me?.org?.name ?? ''} · Operator`} />
      {issues.length > 0 && (
        <Link to="/operator/documents" className={cn(cardClass, 'mb-3 flex items-center gap-3 border-warning/50 p-3')}>
          <HardHat className="size-7 text-warning" aria-hidden />
          <span className="flex-1 text-sm">
            {issues.length} required document{issues.length > 1 ? 's' : ''} need attention before your next job.
          </span>
          <ChevronRight className="size-5 text-muted" aria-hidden />
        </Link>
      )}
      <SectionLabel className="mt-0">On today</SectionLabel>
      {jobs.isPending && <ListSkeleton rows={1} />}
      {jobs.isError && <ErrorState onRetry={() => void jobs.refetch()} />}
      {jobs.data && current.length === 0 && <p className="text-sm text-muted">No jobs today.</p>}
      <div className="space-y-2">{current.map((b) => <JobCard key={b.id} b={b} />)}</div>
      <SectionLabel action={<Link to="/operator/bookings">View all ›</Link>}>Coming up</SectionLabel>
      <div className="space-y-2">
        {next.map((b) => (
          <JobCard key={b.id} b={b} />
        ))}
        {jobs.data && next.length === 0 && <p className="text-sm text-muted">Nothing scheduled yet.</p>}
      </div>
    </AppScreen>
  )
}

export function OperatorBookingsPage() {
  const jobs = useOperatorBookings()
  return (
    <AppScreen root>
      <ScreenTitle title="Assigned Bookings" subtitle="Jobs you’re operating." />
      {jobs.isPending && <ListSkeleton rows={3} />}
      {jobs.isError && <ErrorState onRetry={() => void jobs.refetch()} />}
      {jobs.data?.length === 0 && <EmptyState icon={<CalendarDays strokeWidth={1.75} />} title="No assigned bookings" description="Your supplier will assign you to wet-hire jobs." />}
      <div className="space-y-2">{jobs.data?.map((b) => <JobCard key={b.id} b={b} />)}</div>
    </AppScreen>
  )
}

export function OperatorBookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const q = useBooking(id)
  const b = q.data
  const message = useApiMutation((api, bid: string) => api.openConversationForBooking(bid))
  if (q.isPending) return <AppScreen><ListSkeleton rows={3} /></AppScreen>
  if (!b) return <AppScreen><EmptyState title="Booking not found" /></AppScreen>
  const s = b.site

  return (
    <AppScreen
      footer={
        <>
          {s && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-primary font-medium hover:bg-primary-hover"
            >
              <Navigation className="size-5" aria-hidden /> Directions to Site
            </a>
          )}
          <Button variant="secondary" size="md" block leftIcon={<MessageSquareText className="size-5 text-primary" />} loading={message.isPending} onClick={() => message.mutate(b.id, { onSuccess: (cid) => navigate(`/messages/${cid}`) })}>
            Message Team
          </Button>
        </>
      }
    >
      <div className="flex items-start justify-between">
        <ScreenTitle title={b.machine.title} subtitle={`${b.machine.make} ${b.machine.model} · ${b.ref}`} />
        <StatusPill {...dispatchPill(b)} size="md" />
      </div>
      {s && (
        <BaseMap center={[s.lat, s.lng]} zoom={15} tiles="satellite" interactive={false} label={`Map of ${s.name}`} className="h-40 rounded-[14px] border border-line">
          <Marker position={[s.lat, s.lng]} icon={pinIcon} />
        </BaseMap>
      )}
      <Card className="mt-3 space-y-3 text-sm">
        <p className="flex gap-3">
          <MapPin className="size-5 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="block font-medium">{s?.name}</span>
            {b.deliveryAddress}
          </span>
        </p>
        <p className="flex gap-3">
          <CalendarDays className="size-5 shrink-0 text-primary" aria-hidden />
          {formatDateLong(b.startDate)} – {formatDateLong(b.endDate)}
        </p>
        <p className="flex gap-3">
          <Clock className="size-5 shrink-0 text-primary" aria-hidden />
          {formatTime(s?.deliveryFrom ?? b.startTime)} – {formatTime(s?.deliveryTo ?? b.endTime)} site hours
        </p>
        <p className="flex gap-3">
          <Phone className="size-5 shrink-0 text-primary" aria-hidden />
          <a href={`tel:${b.contactPhone.replace(/\s/g, '')}`} className="text-primary">
            {b.contactName} · {b.contactPhone}
          </a>
        </p>
      </Card>
      {s?.accessNotes && <InfoNote className="mt-3">{s.accessNotes}</InfoNote>}
      {b.customerMessage && <InfoNote className="mt-2">Customer note: {b.customerMessage}</InfoNote>}
    </AppScreen>
  )
}

export function OperatorDocumentsPage() {
  const { rows, loading } = useOperatorDocs()
  return (
    <AppScreen root>
      <ScreenTitle title="My Documents" subtitle="Keep your licences and inductions current." />
      {loading && <ListSkeleton rows={4} thumb={false} />}
      <div className="space-y-2">
        {rows.map(({ r, doc, state }) => (
          <ListRow
            key={r.id}
            to={`/supplier/compliance/upload?type=${r.id}`}
            leading={<StateIcon state={state} />}
            title={r.name}
            subtitle={doc ? (doc.expiryDate ? `Expires ${formatDate(doc.expiryDate)}` : 'No expiry') : r.description}
            trailing={<StatusPill {...(state === 'missing' ? { label: 'Upload', tone: 'neutral' as const } : state === 'expired' ? { label: 'Expired', tone: 'danger' as const } : { status: state })} />}
          />
        ))}
      </div>
      <InfoNote className="mt-3">Your supplier and SiteRun can see these documents. They’re checked before you’re assigned to a site.</InfoNote>
    </AppScreen>
  )
}
