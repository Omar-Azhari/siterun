import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Clock,
  ImageIcon,
  MapPin,
  MoveDiagonal,
  Pencil,
  Paperclip,
  ShieldCheck,
  SlidersHorizontal,
  Weight,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { AppScreen } from '@/components/layout/AppScreen'
import { PhotoCarousel } from '@/pages/browse/MachineDetailPage'
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  InfoNote,
  ListSkeleton,
  StatusPill,
  SuccessState,
  Thumbnail,
} from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import {
  useApiMutation,
  useCategories,
  useDocuments,
  useMachine,
  useRequirements,
} from '@/data/hooks'
import type { Machine } from '@/data/types'
import { stepPath } from './listingShared'
import { docState, latestFor } from '../compliance/complianceUtils'

function useReadiness(m: Machine | null | undefined) {
  const docs = useDocuments({ machineId: m?.id }, !!m)
  const reqs = useRequirements()
  const categories = useCategories()
  if (!m) return { ready: false, docsDone: 0, docsTotal: 0, missing: [] as string[] }
  const groups = categories.data?.find((c) => c.id === m.categoryId)?.requirementGroups ?? [
    'general',
  ]
  const required = (reqs.data ?? []).filter(
    (r) => r.required && (groups as string[]).includes(r.group),
  )
  const okDocs = required.filter((r) =>
    ['verified', 'pending'].includes(docState(latestFor(docs.data ?? [], r))),
  )
  const missing: string[] = []
  if (!m.make || !m.model) missing.push('machine details')
  if (!m.photos.length) missing.push('photos')
  if (!m.rates.daily) missing.push('pricing')
  if (okDocs.length < required.length) missing.push('compliance documents')
  return {
    ready: missing.length === 0,
    docsDone: okDocs.length,
    docsTotal: required.length,
    missing,
  }
}

function Gate({ q }: { q: ReturnType<typeof useMachine> }) {
  if (q.isPending)
    return (
      <AppScreen hideNav>
        <ListSkeleton rows={4} />
      </AppScreen>
    )
  if (q.isError)
    return (
      <AppScreen hideNav>
        <ErrorState onRetry={() => void q.refetch()} />
      </AppScreen>
    )
  return (
    <AppScreen hideNav>
      <EmptyState title="Listing not found" />
    </AppScreen>
  )
}

function SpecRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 py-1.5 text-[15px]">
      <span className="text-[#dae4ef] [&_svg]:size-5">{icon}</span>
      <span className="w-28 shrink-0 text-muted">{label}</span>
      <span className="flex-1">{value}</span>
    </div>
  )
}

/** Board 09 · Preview Listing */
export function PreviewListingPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const q = useMachine(id)
  const m = q.data
  const readiness = useReadiness(m)
  if (!m) return <Gate q={q} />

  return (
    <AppScreen
      hideNav
      footer={
        <Button arrow onClick={() => navigate(`/supplier/machines/${id}/review`)}>
          Continue
        </Button>
      }
    >
      <h1 className="font-display text-[26px] font-bold">Preview Listing</h1>
      <p className="mb-3 text-[15px] text-muted">Check your machine details before submitting.</p>
      <div className="overflow-hidden rounded-[14px]">
        <div className="-mx-0 [&>div]:mx-0">
          <PhotoCarousel
            photos={m.photos.length ? m.photos : ['/images/excavator-grass.webp']}
            alt={m.title}
            overlay={
              <Link
                to={stepPath(m.id, 'photos')}
                className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-app/80 px-3 py-1.5 text-sm backdrop-blur"
              >
                <Pencil className="size-4" aria-hidden /> Edit
              </Link>
            }
          />
        </div>
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-2xl font-bold">{m.title}</p>
          <p className="text-[15px] text-muted">
            {m.make} {m.model}
          </p>
        </div>
        {readiness.ready ? (
          <StatusPill status="ready_to_list" size="md" />
        ) : (
          <StatusPill label="Incomplete" tone="warning" mark="dot" size="md" />
        )}
      </div>
      <div className="mt-2">
        <SpecRow
          icon={<Clock />}
          label="Day rate"
          value={
            <>
              {formatMoney(m.rates.daily)} / day <span className="text-muted">(ex. GST)</span>
            </>
          }
        />
        <SpecRow icon={<MapPin />} label="Location" value={`${m.suburb}, ${m.state}`} />
        {m.specs['Operating weight'] && (
          <SpecRow icon={<Weight />} label="Weight" value={m.specs['Operating weight']} />
        )}
        {m.specs['Max reach'] && (
          <SpecRow icon={<MoveDiagonal />} label="Max reach" value={m.specs['Max reach']} />
        )}
        <SpecRow
          icon={<Paperclip />}
          label="Attachments"
          value={m.attachments.join(', ') || 'None'}
        />
      </div>
      {!readiness.ready && (
        <InfoNote className="mt-3">Still needed: {readiness.missing.join(', ')}.</InfoNote>
      )}
    </AppScreen>
  )
}

/** Board 09 · Review & Submit */
export function ReviewSubmitPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const q = useMachine(id)
  const m = q.data
  const readiness = useReadiness(m)
  const submit = useApiMutation((api) => api.submitMachine(id), {
    success: 'Submitted for approval',
  })
  if (!m) return <Gate q={q} />

  const sections = [
    {
      icon: <CalendarDays />,
      title: 'Machine Details',
      value: `${m.title}\n${m.make} ${m.model}`,
      to: stepPath(m.id, 'details'),
    },
    {
      icon: <ImageIcon />,
      title: 'Photos',
      value: `${m.photos.length} photo${m.photos.length === 1 ? '' : 's'} uploaded`,
      to: stepPath(m.id, 'photos'),
    },
    {
      icon: <SlidersHorizontal />,
      title: 'Specifications',
      value: 'Key specs and features',
      to: stepPath(m.id, 'specs'),
    },
    {
      icon: <CircleDollarSign />,
      title: 'Pricing',
      value: `${formatMoney(m.rates.daily)} / day (ex. GST)`,
      to: stepPath(m.id, 'rates'),
    },
    {
      icon: <MapPin />,
      title: 'Location',
      value: `${m.suburb}, ${m.state}`,
      to: stepPath(m.id, 'service-area'),
    },
    {
      icon: <CalendarDays />,
      title: 'Availability',
      value:
        m.availableFrom <= format(new Date(), 'yyyy-MM-dd')
          ? 'Ready now'
          : `From ${format(parseISO(m.availableFrom), 'd MMM yyyy')}`,
      to: stepPath(m.id, 'rates'),
    },
    {
      icon: <ShieldCheck />,
      title: 'Compliance',
      value: `${readiness.docsDone} of ${readiness.docsTotal} required documents`,
      to: `/supplier/machines/${m.id}/compliance`,
    },
  ]
  const editable = m.status === 'draft' || m.status === 'rejected'

  return (
    <AppScreen
      hideNav
      footer={
        editable ? (
          <>
            <Button
              arrow
              disabled={!readiness.ready}
              loading={submit.isPending}
              onClick={() =>
                submit.mutate(undefined, {
                  onSuccess: () => navigate('/supplier/machines', { replace: true }),
                })
              }
            >
              Submit for Approval
            </Button>
            <p className="text-center text-sm text-[#dae4ef]">
              We’ll review your listing within 1 business day.
            </p>
          </>
        ) : undefined
      }
    >
      <h1 className="font-display text-[26px] font-bold">Review &amp; Submit</h1>
      <p className="mb-3 text-[15px] text-muted">
        Confirm your details are correct before submitting for approval.
      </p>
      {m.status === 'rejected' && m.rejectionReason && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-[#fca5a5]"
        >
          Changes requested: {m.rejectionReason}
        </p>
      )}
      {m.status === 'pending_review' && (
        <InfoNote className="mb-3">Submitted. SiteRun is reviewing this listing.</InfoNote>
      )}
      {m.status === 'live' && <Navigate to={`/supplier/machines/${m.id}/live`} replace />}
      <ul className="space-y-2">
        {sections.map((s) => (
          <li key={s.title}>
            {editable ? (
              <Link
                to={s.to}
                className={cn(cardClass, 'flex items-center gap-3 p-3 hover:border-line-input')}
              >
                <span className="text-primary [&_svg]:size-7 [&_svg]:stroke-[1.4]">{s.icon}</span>
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold">{s.title}</span>
                  <span className="block text-sm whitespace-pre-line text-muted">{s.value}</span>
                </span>
                <span className="flex items-center text-sm text-primary">
                  Edit <ChevronRight className="size-4" aria-hidden />
                </span>
              </Link>
            ) : (
              <div className={cn(cardClass, 'flex items-center gap-3 p-3')}>
                <span className="text-primary [&_svg]:size-7">{s.icon}</span>
                <span>
                  <span className="block text-[15px] font-semibold">{s.title}</span>
                  <span className="block text-sm whitespace-pre-line text-muted">{s.value}</span>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </AppScreen>
  )
}

/** Board 09 · Listing Live (only after admin approval). */
export function ListingLivePage() {
  const { id = '' } = useParams()
  const q = useMachine(id)
  const m = q.data
  if (!m) return <Gate q={q} />
  if (m.status !== 'live') return <Navigate to={`/supplier/machines/${m.id}/review`} replace />

  return (
    <AppScreen
      hideNav
      footer={
        <>
          <ButtonLink to={`/machines/${m.id}`} arrow>
            View Listing
          </ButtonLink>
          <ButtonLink
            to={`/supplier/machines/${m.id}`}
            variant="secondary"
            leftIcon={<CalendarDays className="size-5 text-primary" />}
          >
            Manage Availability
          </ButtonLink>
        </>
      }
    >
      <SuccessState
        title="Your listing is live!"
        description="Your machine is now visible to customers on SiteRun."
      />
      <Card className="mt-4 overflow-hidden p-0">
        <Thumbnail src={m.photos[0]} alt={m.title} className="aspect-[16/10] w-full rounded-none" />
        <div className="p-3">
          <p className="text-lg font-semibold">{m.title}</p>
          <p className="text-sm text-muted">
            {m.make} {m.model}
          </p>
          <StatusPill status="live" className="mt-1.5 bg-transparent px-0" />
        </div>
      </Card>
    </AppScreen>
  )
}
