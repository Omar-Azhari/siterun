import { thumb } from '@/lib/images'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import {
  Button,
  EmptyState,
  ErrorState,
  InfoNote,
  ListSkeleton,
  ScreenTitle,
  SectionLabel,
  StatusPill,
  Thumbnail,
  type StatusKey,
} from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { useCategories, useDocuments, useMachine, useRequirements } from '@/data/hooks'
import type { ComplianceRequirement } from '@/data/types'
import { StateIcon } from './complianceShared'
import { docState, latestFor, type DocState } from './complianceUtils'

const PILL: Record<DocState, { status?: StatusKey; label?: string; tone?: 'neutral' | 'danger' }> =
  {
    verified: { status: 'verified' },
    pending: { status: 'pending' },
    rejected: { status: 'rejected' },
    expired: { label: 'Expired', tone: 'danger' },
    missing: { label: 'Upload', tone: 'neutral' },
  }

/** Board 08 · Compliance Status for one machine. */
export function ComplianceStatusPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const machine = useMachine(id)
  const docs = useDocuments({ machineId: id })
  const reqs = useRequirements()
  const categories = useCategories()
  const m = machine.data

  if (machine.isPending || reqs.isPending)
    return (
      <AppScreen>
        <ListSkeleton rows={5} />
      </AppScreen>
    )
  if (machine.isError)
    return (
      <AppScreen>
        <ErrorState onRetry={() => void machine.refetch()} />
      </AppScreen>
    )
  if (!m)
    return (
      <AppScreen>
        <EmptyState title="Machine not found" />
      </AppScreen>
    )

  const groups = categories.data?.find((c) => c.id === m.categoryId)?.requirementGroups ?? [
    'general',
  ]
  const required = (reqs.data ?? []).filter((r) => (groups as string[]).includes(r.group))
  const list = docs.data ?? []
  const rows = required.map((r) => ({
    r,
    doc: latestFor(list, r),
    state: docState(latestFor(list, r)),
  }))
  const blocking = rows.filter(
    (x) => x.r.required && ['missing', 'rejected', 'expired'].includes(x.state),
  )
  const canSubmit = (m.status === 'draft' || m.status === 'rejected') && blocking.length === 0

  const row = ({
    r,
    doc,
    state,
  }: {
    r: ComplianceRequirement
    doc?: (typeof list)[number]
    state: DocState
  }) => (
    <li key={r.id}>
      <Link
        to={`/supplier/compliance/upload?machine=${m.id}&type=${r.id}`}
        className={cn(cardClass, 'flex items-center gap-3 p-3 hover:border-line-input')}
        aria-label={`${r.name}: ${state}${doc?.expiryDate ? `, expires ${formatDate(doc.expiryDate)}` : ''}. ${state === 'missing' ? 'Upload' : 'Replace'} document`}
      >
        <StateIcon state={state} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">
            {r.name}
            {!r.required && <span className="ml-1 text-xs font-normal text-muted">(optional)</span>}
          </span>
          <span className="block text-xs text-muted">
            {doc?.expiryDate
              ? `Expires ${formatDate(doc.expiryDate)}`
              : state === 'missing'
                ? 'Not uploaded'
                : 'No expiry'}
          </span>
          {state === 'rejected' && doc?.rejectionReason && (
            <span className="block text-xs text-[#f87171]">{doc.rejectionReason}</span>
          )}
        </span>
        <StatusPill {...PILL[state]} size="md" />
        <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
      </Link>
    </li>
  )

  return (
    <AppScreen
      footer={
        m.status === 'live' ? (
          <Button arrow onClick={() => navigate(`/supplier/machines/${m.id}`)}>
            Manage Listing
          </Button>
        ) : m.status === 'pending_review' ? (
          <Button disabled>Awaiting SiteRun review</Button>
        ) : (
          <Button
            arrow
            disabled={!canSubmit}
            onClick={() => navigate(`/supplier/machines/${m.id}/preview`)}
          >
            Review &amp; Submit
          </Button>
        )
      }
    >
      <ScreenTitle
        title="Compliance Status"
        subtitle="All required documents for this machine are listed below."
      />
      <div className={cn(cardClass, 'flex items-center gap-3 p-2.5')}>
        <Thumbnail src={thumb(m.photos[0])} alt={m.title} className="h-16 w-24" />
        <div>
          <p className="text-base font-semibold">{m.title}</p>
          <p className="text-sm text-muted">
            {m.make} {m.model}
          </p>
          {m.assetCode && <p className="text-sm text-muted">{m.assetCode}</p>}
        </div>
      </div>
      {docs.isPending ? (
        <ListSkeleton rows={4} thumb={false} />
      ) : (
        <ul className="mt-3 space-y-2">{rows.filter((x) => x.r.group !== 'crane').map(row)}</ul>
      )}
      {rows.some((x) => x.r.group === 'crane') && (
        <>
          <SectionLabel>Crane documents</SectionLabel>
          <ul className="space-y-2">{rows.filter((x) => x.r.group === 'crane').map(row)}</ul>
        </>
      )}
      <InfoNote className="mt-3">
        {blocking.length > 0
          ? `Upload ${blocking.map((b) => b.r.name).join(', ')} to submit this machine.`
          : 'All documents must be verified before this machine can go live.'}
      </InfoNote>
    </AppScreen>
  )
}
