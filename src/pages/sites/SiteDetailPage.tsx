import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, Clock, MapPin, Pencil, Phone, Plus, User } from 'lucide-react'
import { Marker } from 'react-leaflet'
import { AppScreen } from '@/components/layout/AppScreen'
import { BaseMap } from '@/components/domain/maps/MapParts'
import { pinIcon } from '@/components/domain/maps/mapUtils'
import { hirePill } from '@/components/domain/bookingStatus'
import {
  Button,
  ButtonLink,
  Card,
  DateField,
  EmptyState,
  ErrorState,
  Input,
  ListRow,
  ListSkeleton,
  ScreenTitle,
  SectionLabel,
  Select,
  StatusPill,
  Thumbnail,
} from '@/components/ui'
import { formatDateLong, formatTime } from '@/lib/format'
import { PROJECT_TYPES } from '@/data/constants'
import { useApiMutation, useMe, useMyBookings, useSite } from '@/data/hooks'
import { AccessFields } from './SiteAccessPage'
import { accessSchema, DURATIONS } from './siteDraft'

/** Site overview (reached from Your Sites). */
export function SiteDetailPage() {
  const { id } = useParams()
  const site = useSite(id)
  const bookings = useMyBookings()
  const { data: me } = useMe()
  const s = site.data

  if (site.isPending) return <AppScreen><ListSkeleton rows={3} /></AppScreen>
  if (site.isError) return <AppScreen><ErrorState onRetry={() => void site.refetch()} /></AppScreen>
  if (!s) return <AppScreen><EmptyState title="Site not found" description="It may have been removed." /></AppScreen>

  const hires = (bookings.data ?? []).filter((b) => b.siteId === s.id && !['completed', 'declined', 'cancelled'].includes(b.status))
  const canEdit = me?.role !== 'viewer'

  return (
    <AppScreen
      headerTrailing={
        canEdit ? (
          <Link to={`/sites/${s.id}/edit`} aria-label="Edit site" className="flex size-11 items-center justify-center rounded-xl hover:bg-white/5">
            <Pencil className="size-5" />
          </Link>
        ) : undefined
      }
      footer={canEdit ? <ButtonLink to={`/browse?site=${s.id}`} leftIcon={<Plus className="size-5" />}>Hire Equipment for this Site</ButtonLink> : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <ScreenTitle title={s.name} subtitle={`${s.address}, ${s.suburb} ${s.state} ${s.postcode}`} />
        <StatusPill status={s.status} className="mt-1" />
      </div>
      <BaseMap center={[s.lat, s.lng]} zoom={15} tiles="satellite" interactive={false} label={`Map of ${s.name}`} className="h-40 rounded-[14px] border border-line">
        <Marker position={[s.lat, s.lng]} icon={pinIcon} />
      </BaseMap>
      <Card className="mt-3 space-y-2.5 text-sm">
        <p className="flex items-center gap-3"><MapPin className="size-5 text-primary" aria-hidden />{s.projectType}</p>
        <p className="flex items-center gap-3"><CalendarDays className="size-5 text-primary" aria-hidden />Starts {formatDateLong(s.startDate)} · {s.durationMonths} months</p>
        <p className="flex items-center gap-3"><Clock className="size-5 text-primary" aria-hidden />Deliveries {formatTime(s.deliveryFrom)} – {formatTime(s.deliveryTo)}</p>
        <p className="flex items-center gap-3"><User className="size-5 text-primary" aria-hidden />{s.contactName}</p>
        <p className="flex items-center gap-3"><Phone className="size-5 text-primary" aria-hidden /><a href={`tel:${s.contactPhone.replace(/\s/g, '')}`} className="text-primary">{s.contactPhone}</a></p>
        {s.accessNotes && <p className="rounded-lg bg-input px-3 py-2 text-[13px] text-[#dae4ef]">{s.accessNotes}</p>}
      </Card>
      <SectionLabel>Hires on this site ({hires.length})</SectionLabel>
      <div className="space-y-2">
        {bookings.isPending && <ListSkeleton rows={2} />}
        {bookings.data && hires.length === 0 && <p className="text-sm text-muted">No current hires.</p>}
        {hires.map((b) => (
          <ListRow
            key={b.id}
            to={['requested', 'confirmed'].includes(b.status) ? `/bookings/${b.id}` : `/hires/${b.id}`}
            leading={<Thumbnail src={b.machine.photos[0]} alt={b.machine.title} className="size-14" />}
            title={b.machine.title}
            subtitle={`${b.machine.make} ${b.machine.model}`}
            meta={`${formatDateLong(b.startDate)} – ${formatDateLong(b.endDate)}`}
            trailing={<StatusPill {...hirePill(b)} />}
          />
        ))}
      </div>
    </AppScreen>
  )
}

const editSchema = z.object({
  name: z.string().trim().min(2, 'Enter a site name'),
  projectType: z.string().min(1),
  startDate: z.string().min(1, 'Choose a start date'),
  durationMonths: z.string().min(1),
  status: z.enum(['active', 'planning', 'on_hold']),
})

/** Edit site details and access window. */
export function SiteEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const site = useSite(id)
  const s = site.data
  const details = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    values: s ? { name: s.name, projectType: s.projectType, startDate: s.startDate, durationMonths: String(s.durationMonths), status: s.status } : undefined,
  })
  const access = useForm<z.infer<typeof accessSchema>>({
    resolver: zodResolver(accessSchema),
    values: s
      ? { deliveryFrom: s.deliveryFrom, deliveryTo: s.deliveryTo, accessNotes: s.accessNotes, contactName: s.contactName, contactPhone: s.contactPhone.replace(/^\+61\s*/, '') }
      : undefined,
  })
  const save = useApiMutation((api, patch: Parameters<typeof api.updateSite>[1]) => api.updateSite(id ?? '', patch), { success: 'Site updated' })

  if (!s) return <AppScreen>{site.isPending ? <ListSkeleton rows={3} /> : <EmptyState title="Site not found" />}</AppScreen>

  const onSave = async () => {
    const [a, b] = await Promise.all([details.trigger(), access.trigger()])
    if (!a || !b) return
    const d = details.getValues()
    const x = access.getValues()
    save.mutate(
      { ...d, durationMonths: Number(d.durationMonths), ...x, contactPhone: `+61 ${x.contactPhone}` },
      { onSuccess: () => navigate(`/sites/${s.id}`) },
    )
  }

  return (
    <AppScreen hideNav footer={<Button arrow onClick={onSave} loading={save.isPending}>Save Changes</Button>}>
      <ScreenTitle title="Edit Site" subtitle={s.name} />
      <Input label="Site name" error={details.formState.errors.name?.message} {...details.register('name')} />
      <Select label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'planning', label: 'Planning' }, { value: 'on_hold', label: 'On Hold' }]} {...details.register('status')} />
      <Select label="Project type" options={PROJECT_TYPES.map((t) => ({ value: t, label: t }))} {...details.register('projectType')} />
      <Controller control={details.control} name="startDate" render={({ field }) => <DateField label="Start date" value={field.value} onChange={field.onChange} />} />
      <Select label="Expected duration" options={DURATIONS} {...details.register('durationMonths')} />
      <SectionLabel>Access window</SectionLabel>
      <AccessFields control={access.control} errors={access.formState.errors} register={access.register} />
      <div className="mt-2 flex items-center gap-3 text-sm text-muted">
        <Thumbnail src={s.photoUrl} alt="" className="size-10" />
        <Link to="/sites/new/location" className="text-primary">Need a different location? Create a new site</Link>
      </div>
    </AppScreen>
  )
}
