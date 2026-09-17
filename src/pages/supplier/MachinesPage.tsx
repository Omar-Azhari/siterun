import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Forklift, Pause, Pencil, Play, Plus, ShieldCheck } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { dispatchPill } from '@/components/domain/bookingStatus'
import { Button, ButtonLink, Card, EmptyState, ErrorState, ListRow, ListSkeleton, Price, ScreenTitle, SectionLabel, SegmentedTabs, StatusPill, Thumbnail } from '@/components/ui'
import { useApiMutation, useMachine, useMyMachines, useSupplierBookings } from '@/data/hooks'
import { PhotoCarousel } from '@/pages/browse/MachineDetailPage'
import { STEPS, stepPath } from './listing/listingShared'

type Tab = 'all' | 'live' | 'drafts' | 'review'

/** Supplier › Machines (fleet list; not on the boards). */
export function MachinesPage() {
  const machines = useMyMachines()
  const [tab, setTab] = useState<Tab>('all')
  const all = machines.data ?? []
  const counts = {
    live: all.filter((m) => m.status === 'live' || m.status === 'paused').length,
    drafts: all.filter((m) => m.status === 'draft' || m.status === 'rejected').length,
    review: all.filter((m) => m.status === 'pending_review').length,
  }
  const list = all.filter((m) =>
    tab === 'all' ? true : tab === 'live' ? ['live', 'paused'].includes(m.status) : tab === 'drafts' ? ['draft', 'rejected'].includes(m.status) : m.status === 'pending_review',
  )
  const href = (m: (typeof all)[number]) => {
    if (m.status === 'draft') {
      const step = STEPS[Math.min(m.draftStep, STEPS.length - 1)] ?? 'details'
      return m.draftStep >= 6 ? `/supplier/machines/${m.id}/compliance` : stepPath(m.id, step)
    }
    if (m.status === 'rejected') return `/supplier/machines/${m.id}/review`
    return `/supplier/machines/${m.id}`
  }

  return (
    <AppScreen root footer={<ButtonLink to="/supplier/machines/new/category" leftIcon={<Plus className="size-5" />}>Add Machine</ButtonLink>}>
      <ScreenTitle title="Machines" subtitle="Your fleet, drafts and listings under review." />
      <SegmentedTabs
        label="Filter machines"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'all', label: 'All', count: all.length },
          { value: 'live', label: 'Live', count: counts.live },
          { value: 'drafts', label: 'Drafts', count: counts.drafts },
          { value: 'review', label: 'Review', count: counts.review },
        ]}
      />
      <div className="mt-3 space-y-2" role="tabpanel">
        {machines.isPending && <ListSkeleton rows={4} />}
        {machines.isError && <ErrorState onRetry={() => void machines.refetch()} />}
        {machines.data && list.length === 0 && <EmptyState icon={<Forklift strokeWidth={1.75} />} title="Nothing here yet" description="Add a machine to start taking bookings." />}
        {list.map((m) => (
          <ListRow
            key={m.id}
            to={href(m)}
            leading={<Thumbnail src={m.photos[0]?.replace('.webp', '-sm.webp')} alt="" className="h-16 w-20" />}
            title={m.title}
            subtitle={`${m.make || 'Make'} ${m.model}${m.assetCode ? ` · ${m.assetCode}` : ''}`}
            meta={m.status === 'draft' ? `Draft · step ${Math.min(m.draftStep + 1, 6)} of 6` : m.rates.daily ? <Price cents={m.rates.daily} size="sm" /> : null}
            trailing={<StatusPill status={m.status === 'rejected' ? 'rejected' : m.status} />}
          />
        ))}
      </div>
    </AppScreen>
  )
}

/** Supplier › manage one listing (availability, pause, bookings). */
export function MachineManagePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const q = useMachine(id)
  const bookings = useSupplierBookings()
  const pause = useApiMutation((api, paused: boolean) => api.setMachinePaused(id, paused), { success: (m) => (m.status === 'paused' ? 'Listing paused' : 'Listing is live again') })
  const m = q.data
  if (q.isPending) return <AppScreen><ListSkeleton rows={4} /></AppScreen>
  if (!m) return <AppScreen><EmptyState title="Listing not found" /></AppScreen>
  const upcoming = (bookings.data ?? []).filter((b) => b.machineId === m.id && !['completed', 'declined', 'cancelled'].includes(b.status))

  return (
    <AppScreen
      footer={
        <>
          {m.status === 'live' && (
            <Button variant="secondary" leftIcon={<Pause className="size-5 text-primary" />} loading={pause.isPending} onClick={() => pause.mutate(true)}>
              Pause Listing
            </Button>
          )}
          {m.status === 'paused' && (
            <>
              <Button leftIcon={<Play className="size-5" />} loading={pause.isPending} onClick={() => pause.mutate(false)}>
                Make Live Again
              </Button>
              <Button variant="secondary" leftIcon={<Pencil className="size-5 text-primary" />} onClick={() => navigate(stepPath(m.id, 'details'))}>
                Edit Listing
              </Button>
            </>
          )}
          {['draft', 'rejected', 'pending_review'].includes(m.status) && <ButtonLink to={`/supplier/machines/${m.id}/review`} arrow>Continue Listing</ButtonLink>}
        </>
      }
    >
      <PhotoCarousel photos={m.photos} alt={m.title} />
      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{m.title}</h1>
          <p className="text-muted">
            {m.make} {m.model} {m.assetCode && `· ${m.assetCode}`}
          </p>
        </div>
        <StatusPill status={m.status} size="md" />
      </div>
      <Card className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <p className="text-muted">Daily</p>
          <p className="font-semibold">{m.rates.daily ? `$${m.rates.daily / 100}` : '–'}</p>
        </div>
        <div>
          <p className="text-muted">Radius</p>
          <p className="font-semibold">{m.serviceRadiusKm} km</p>
        </div>
        <div>
          <p className="text-muted">Available</p>
          <p className="font-semibold">{format(parseISO(m.availableFrom), 'd MMM')}</p>
        </div>
      </Card>
      <ListRow className="mt-2" to={`/supplier/machines/${m.id}/compliance`} leading={<ShieldCheck className="size-7 text-primary" strokeWidth={1.5} />} title="Compliance documents" subtitle="Status, expiry and uploads" />
      {m.status === 'live' && <ListRow className="mt-2" to={`/machines/${m.id}`} title="View public listing" subtitle="See what customers see" />}
      <SectionLabel>Booked dates ({upcoming.length})</SectionLabel>
      <div className="space-y-2">
        {upcoming.length === 0 && <p className="text-sm text-muted">No upcoming bookings. This machine is available.</p>}
        {upcoming.map((b) => (
          <Link key={b.id} to={`/supplier/bookings/${b.id}`} className="flex items-center justify-between rounded-[12px] border border-line bg-card px-3 py-2.5 text-sm hover:border-line-input">
            <span>
              <span className="block font-medium">
                {format(parseISO(b.startDate), 'd MMM')} – {format(parseISO(b.endDate), 'd MMM')}
              </span>
              <span className="text-muted">{b.contractor.name}</span>
            </span>
            <StatusPill {...dispatchPill(b)} />
          </Link>
        ))}
      </div>
    </AppScreen>
  )
}
