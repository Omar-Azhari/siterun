import { thumb } from '@/lib/images'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  Building2,
  CalendarDays,
  CircleAlert,
  CircleUserRound,
  FileText,
  LifeBuoy,
  LogOut,
  ShieldCheck,
  TriangleAlert,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { dispatchPill } from '@/components/domain/bookingStatus'
import {
  BottomSheet,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  ListSkeleton,
  ScreenTitle,
  SearchInput,
  SectionLabel,
  SegmentedTabs,
  Skeleton,
  StatTile,
  StatusPill,
  Textarea,
  Thumbnail,
} from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { formatDate, formatMoney, formatMoneyCompact, timeAgo } from '@/lib/format'
import type { TimeRange } from '@/data/api'
import { getApi } from '@/data/client'
import {
  useAdminActivity,
  useAdminStats,
  useAllBookings,
  useApiMutation,
  useCategories,
  useDocuments,
  useMachine,
  usePendingDocuments,
  usePendingMachines,
  useRequirements,
  useSupplierOrgs,
} from '@/data/hooks'
import type { AdminActivity, ComplianceDocument } from '@/data/types'
import { PhotoCarousel } from '@/pages/browse/MachineDetailPage'
import { StateIcon } from '@/pages/supplier/compliance/complianceShared'
import { docState, latestFor } from '@/pages/supplier/compliance/complianceUtils'

const DOT: Record<AdminActivity['kind'], string> = {
  supplier_registered: 'bg-success',
  machine_approved: 'bg-primary',
  machine_rejected: 'bg-danger',
  dispute: 'bg-danger',
  payout: 'bg-success',
  document_verified: 'bg-primary',
  document_rejected: 'bg-warning',
}

/** Board 10 · Admin Dashboard */
export function AdminDashboardPage() {
  const [range, setRange] = useState<TimeRange>('30d')
  const stats = useAdminStats(range)
  const activity = useAdminActivity()
  const [all, setAll] = useState(false)
  const s = stats.data
  const items = (activity.data ?? []).slice(0, all ? 50 : 4)

  return (
    <AppScreen root>
      <ScreenTitle title="Admin Dashboard" subtitle="Platform overview and key metrics." />
      <SegmentedTabs
        label="Time range"
        value={range}
        onChange={setRange}
        options={[
          { value: '7d', label: '7D' },
          { value: '30d', label: '30D' },
          { value: '90d', label: '90D' },
          { value: '1y', label: '1Y' },
        ]}
      />
      {stats.isError && <ErrorState className="mt-3" onRetry={() => void stats.refetch()} />}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {s ? (
          <>
            <StatTile
              icon={<UsersRound strokeWidth={1.5} />}
              label="Users"
              value={s.users.toLocaleString('en-AU')}
              trend={s.usersTrend}
            />
            <StatTile
              icon={<Building2 strokeWidth={1.5} />}
              label="Suppliers"
              value={s.suppliers.toLocaleString('en-AU')}
              trend={s.suppliersTrend}
            />
            <StatTile
              icon={<CalendarDays strokeWidth={1.5} />}
              label="Bookings"
              value={s.bookings.toLocaleString('en-AU')}
              trend={s.bookingsTrend}
            />
            <StatTile
              icon={<Wallet strokeWidth={1.5} />}
              label="Payouts"
              value={formatMoneyCompact(s.payoutsCents)}
              trend={s.payoutsTrend}
            />
            <StatTile
              icon={<TriangleAlert className="text-danger" strokeWidth={1.5} />}
              label="Disputes"
              value={s.disputes}
              trend={s.disputesTrend}
              className="col-span-2"
            />
          </>
        ) : (
          Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className={cn('h-24', i === 4 && 'col-span-2')} />
          ))
        )}
      </div>
      <SectionLabel
        action={
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            className="flex min-h-11 items-center"
          >
            {all ? 'Show less' : 'View all ›'}
          </button>
        }
      >
        Recent Activity
      </SectionLabel>
      {activity.isPending && <ListSkeleton rows={3} thumb={false} />}
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id} className={cn(cardClass, 'flex items-start gap-3 p-3')}>
            <span aria-hidden className={cn('mt-1 size-4 shrink-0 rounded-full', DOT[a.kind])} />
            <span className="text-sm">
              <span className="block font-medium">{a.title}</span>
              <span className="block text-[#dae4ef]">{a.detail}</span>
              <span className="block text-xs text-muted">{timeAgo(a.createdAt)}</span>
            </span>
          </li>
        ))}
      </ul>
    </AppScreen>
  )
}

/** Board 10 · Admin Approvals */
export function AdminApprovalsPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'documents' ? 'documents' : 'machines'
  const machines = usePendingMachines()
  const docs = usePendingDocuments()
  const reqs = useRequirements()

  return (
    <AppScreen root>
      <ScreenTitle title="Admin Approvals" subtitle="Review and approve supplier submissions." />
      <SegmentedTabs
        label="Approval queue"
        value={tab}
        onChange={(v) =>
          setParams(v === 'documents' ? { tab: 'documents' } : {}, { replace: true })
        }
        options={[
          { value: 'machines', label: 'Machines', count: machines.data?.length ?? 0 },
          { value: 'documents', label: 'Documents', count: docs.data?.length ?? 0 },
        ]}
      />
      <div className="mt-3 space-y-2.5" role="tabpanel">
        {tab === 'machines' && (
          <>
            {machines.isPending && <ListSkeleton rows={3} />}
            {machines.isError && <ErrorState onRetry={() => void machines.refetch()} />}
            {machines.data?.length === 0 && (
              <EmptyState
                icon={<ShieldCheck strokeWidth={1.75} />}
                title="Queue is clear"
                description="No listings waiting for review."
              />
            )}
            {machines.data?.map((m) => (
              <Card key={m.id} className="p-3">
                <div className="flex gap-3">
                  <Thumbnail src={thumb(m.photos[0])} alt={m.title} className="h-[84px] w-[92px]" />
                  <div className="min-w-0">
                    <p className="text-base font-semibold">{m.title}</p>
                    <p className="text-sm text-[#dae4ef]">
                      {m.make} {m.model}
                    </p>
                    <p className="text-sm text-muted">{m.supplierName}</p>
                    <StatusPill status="pending_review" className="mt-1" />
                  </div>
                </div>
                <ButtonLink
                  to={`/admin/approvals/machines/${m.id}`}
                  size="md"
                  block
                  arrow
                  className="mt-3"
                >
                  Review
                </ButtonLink>
              </Card>
            ))}
          </>
        )}
        {tab === 'documents' && (
          <>
            {docs.isPending && <ListSkeleton rows={3} thumb={false} />}
            {docs.data?.length === 0 && (
              <EmptyState icon={<FileText strokeWidth={1.75} />} title="No documents to verify" />
            )}
            {docs.data?.map((d) => (
              <ListRow
                key={d.id}
                to={`/admin/approvals/documents/${d.id}`}
                leading={<FileText className="size-8 text-primary" strokeWidth={1.4} />}
                title={reqs.data?.find((r) => r.id === d.requirementId)?.name ?? 'Document'}
                subtitle={`${d.orgName}${d.machineTitle ? ` · ${d.machineTitle}` : ''}`}
                meta={`Uploaded ${timeAgo(d.uploadedAt)}${d.expiryDate ? ` · expires ${formatDate(d.expiryDate)}` : ''}`}
              />
            ))}
          </>
        )}
      </div>
    </AppScreen>
  )
}

function RejectSheet({
  open,
  onClose,
  onReject,
  loading,
  what,
}: {
  open: boolean
  onClose: () => void
  onReject: (reason: string) => void
  loading: boolean
  what: string
}) {
  const [reason, setReason] = useState('')
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Reject ${what}`}
      footer={
        <Button
          variant="danger"
          disabled={reason.trim().length < 5}
          loading={loading}
          onClick={() => onReject(reason)}
        >
          Send Rejection
        </Button>
      }
    >
      <Textarea
        label="Reason (sent to the supplier)"
        rows={4}
        maxLength={500}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        hint="Be specific so they know what to fix."
      />
    </BottomSheet>
  )
}

/** Admin › review one machine listing. */
export function AdminMachineReviewPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const q = useMachine(id)
  const docs = useDocuments({ machineId: id })
  const reqs = useRequirements()
  const categories = useCategories()
  const [rejecting, setRejecting] = useState(false)
  const [docReject, setDocReject] = useState<ComplianceDocument | null>(null)
  const review = useApiMutation(
    (api, v: { approve: boolean; reason?: string }) => api.reviewMachine(id, v.approve, v.reason),
    {
      success: (m) =>
        m.status === 'live' ? `${m.title} is now live` : 'Rejection sent to supplier',
    },
  )
  const reviewDoc = useApiMutation(
    (api, v: { id: string; approve: boolean; reason?: string }) =>
      api.reviewDocument(v.id, v.approve, v.reason),
    {
      success: (d) => (d.status === 'verified' ? 'Document verified' : 'Document rejected'),
    },
  )
  const m = q.data
  if (q.isPending)
    return (
      <AppScreen>
        <ListSkeleton rows={4} />
      </AppScreen>
    )
  if (!m)
    return (
      <AppScreen>
        <EmptyState title="Listing not found" />
      </AppScreen>
    )
  const groups = categories.data?.find((c) => c.id === m.categoryId)?.requirementGroups ?? [
    'general',
  ]
  const required = (reqs.data ?? []).filter((r) => (groups as string[]).includes(r.group))
  const allVerified = required
    .filter((r) => r.required)
    .every((r) => docState(latestFor(docs.data ?? [], r)) === 'verified')
  const pending = m.status === 'pending_review'

  const openDoc = async (d: ComplianceDocument) => {
    const url = await getApi().getDocumentUrl(d.id)
    if (url) window.open(url, '_blank', 'noopener')
  }

  return (
    <AppScreen
      footer={
        pending ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="danger" size="md" block onClick={() => setRejecting(true)}>
              Reject
            </Button>
            <Button
              size="md"
              block
              disabled={!allVerified}
              loading={review.isPending}
              onClick={() =>
                review.mutate({ approve: true }, { onSuccess: () => navigate('/admin/approvals') })
              }
            >
              Approve
            </Button>
          </div>
        ) : undefined
      }
    >
      <PhotoCarousel photos={m.photos} alt={m.title} />
      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{m.title}</h1>
          <p className="text-muted">
            {m.make} {m.model} {m.year && `· ${m.year}`}
          </p>
        </div>
        <StatusPill status={m.status} size="md" />
      </div>
      <Card className="mt-3 space-y-1.5 text-sm">
        <p>
          <span className="text-muted">Supplier: </span>
          {m.supplierName}
        </p>
        <p>
          <span className="text-muted">Serial / rego: </span>
          {m.serialNumber || '–'} / {m.registration || '–'}
        </p>
        <p>
          <span className="text-muted">Rates: </span>
          {formatMoney(m.rates.daily)}/day
          {m.rates.wetDaily ? ` · wet ${formatMoney(m.rates.wetDaily)}` : ''}
        </p>
        <p>
          <span className="text-muted">Base: </span>
          {m.suburb}, {m.state} · {m.serviceRadiusKm} km
        </p>
        {Object.entries(m.specs).map(([k, v]) => (
          <p key={k}>
            <span className="text-muted">{k}: </span>
            {v}
          </p>
        ))}
        {m.submittedAt && <p className="text-xs text-subtle">Submitted {timeAgo(m.submittedAt)}</p>}
      </Card>
      <SectionLabel>Documents</SectionLabel>
      <ul className="space-y-2">
        {required.map((r) => {
          const d = latestFor(docs.data ?? [], r)
          const st = docState(d)
          return (
            <li key={r.id} className={cn(cardClass, 'p-3')}>
              <div className="flex items-center gap-3">
                <StateIcon state={st} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {r.name}
                    {!r.required && <span className="text-xs text-muted"> (optional)</span>}
                  </span>
                  <span className="block text-xs text-muted">
                    {d
                      ? `${d.fileName}${d.expiryDate ? ` · expires ${formatDate(d.expiryDate)}` : ''}`
                      : 'Not uploaded'}
                  </span>
                </span>
                {d?.fileUrl && (
                  <button
                    type="button"
                    className="text-sm text-primary"
                    onClick={() => void openDoc(d)}
                  >
                    Open
                  </button>
                )}
              </div>
              {d?.status === 'pending' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button variant="danger" size="sm" block onClick={() => setDocReject(d)}>
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    block
                    loading={reviewDoc.isPending && reviewDoc.variables?.id === d.id}
                    onClick={() => reviewDoc.mutate({ id: d.id, approve: true })}
                  >
                    Verify
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {pending && !allVerified && (
        <p className="mt-3 flex items-center gap-2 text-sm text-[#f7b84b]">
          <CircleAlert className="size-4" aria-hidden /> Verify every required document before
          approving.
        </p>
      )}
      <RejectSheet
        open={rejecting}
        onClose={() => setRejecting(false)}
        what="listing"
        loading={review.isPending}
        onReject={(reason) =>
          review.mutate(
            { approve: false, reason },
            { onSuccess: () => navigate('/admin/approvals') },
          )
        }
      />
      <RejectSheet
        open={!!docReject}
        onClose={() => setDocReject(null)}
        what="document"
        loading={reviewDoc.isPending}
        onReject={(reason) =>
          docReject &&
          reviewDoc.mutate(
            { id: docReject.id, approve: false, reason },
            { onSuccess: () => setDocReject(null) },
          )
        }
      />
    </AppScreen>
  )
}

/** Admin › verify one document. */
export function AdminDocumentReviewPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const docs = usePendingDocuments()
  const reqs = useRequirements()
  const [rejecting, setRejecting] = useState(false)
  const review = useApiMutation(
    (api, v: { approve: boolean; reason?: string }) => api.reviewDocument(id, v.approve, v.reason),
    {
      success: (d) =>
        d.status === 'verified' ? 'Document verified' : 'Rejection sent to supplier',
    },
  )
  const d = docs.data?.find((x) => x.id === id)
  if (docs.isPending)
    return (
      <AppScreen>
        <ListSkeleton rows={3} />
      </AppScreen>
    )
  if (!d)
    return (
      <AppScreen>
        <EmptyState
          title="Already reviewed"
          description="This document is no longer in the queue."
          action={
            <ButtonLink to="/admin/approvals?tab=documents" size="md" block>
              Back to queue
            </ButtonLink>
          }
        />
      </AppScreen>
    )
  const req = reqs.data?.find((r) => r.id === d.requirementId)
  const done = () => navigate('/admin/approvals?tab=documents')

  return (
    <AppScreen
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="danger" size="md" block onClick={() => setRejecting(true)}>
            Reject
          </Button>
          <Button
            size="md"
            block
            loading={review.isPending}
            onClick={() => review.mutate({ approve: true }, { onSuccess: done })}
          >
            Verify
          </Button>
        </div>
      }
    >
      <ScreenTitle
        title={req?.name ?? 'Document'}
        subtitle={`${d.orgName}${d.machineTitle ? ` · ${d.machineTitle}` : ''}`}
      />
      <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-[14px] border border-line bg-white/5">
        {d.fileUrl && d.fileUrl.startsWith('data:image') ? (
          <img src={d.fileUrl} alt={d.fileName} className="size-full object-contain" />
        ) : d.fileUrl ? (
          <iframe title={d.fileName} src={d.fileUrl} className="size-full bg-white" />
        ) : (
          <div className="p-6 text-center text-sm text-muted">
            <FileText className="mx-auto mb-2 size-12 text-primary" strokeWidth={1.2} />
            {d.fileName}
            <br />
            Preview not available in demo mode.
          </div>
        )}
      </div>
      <Card className="mt-3 space-y-1 text-sm">
        <p>
          <span className="text-muted">File: </span>
          {d.fileName} ({(d.fileSize / 1024 / 1024).toFixed(1)} MB)
        </p>
        <p>
          <span className="text-muted">Expiry: </span>
          {d.expiryDate ? formatDate(d.expiryDate) : 'None'}
        </p>
        <p>
          <span className="text-muted">Uploaded: </span>
          {format(parseISO(d.uploadedAt), 'd MMM yyyy, h:mm a')}
        </p>
        {d.notes && (
          <p>
            <span className="text-muted">Notes: </span>
            {d.notes}
          </p>
        )}
        <p className="text-xs text-subtle">{req?.description}</p>
      </Card>
      <RejectSheet
        open={rejecting}
        onClose={() => setRejecting(false)}
        what="document"
        loading={review.isPending}
        onReject={(reason) => review.mutate({ approve: false, reason }, { onSuccess: done })}
      />
    </AppScreen>
  )
}

export function AdminSuppliersPage() {
  const suppliers = useSupplierOrgs()
  const [q, setQ] = useState('')
  const list = (suppliers.data ?? []).filter((s) =>
    s.name.toLowerCase().includes(q.trim().toLowerCase()),
  )
  return (
    <AppScreen root>
      <ScreenTitle
        title="Suppliers"
        subtitle={`${suppliers.data?.length ?? '…'} suppliers on SiteRun`}
      />
      <SearchInput
        placeholder="Search suppliers..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onClear={() => setQ('')}
      />
      {suppliers.isPending && <ListSkeleton rows={4} thumb={false} />}
      <div className="space-y-2">
        {list.map((s) => (
          <Card key={s.id} className="py-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{s.name}</p>
              {s.rating !== null ? (
                <span className="text-sm text-[#dae4ef]">★ {s.rating.toFixed(1)}</span>
              ) : (
                <StatusPill label="New" tone="info" />
              )}
            </div>
            <p className="text-sm text-muted">
              {s.contactName} · {s.email}
            </p>
            <p className="text-sm text-muted">
              {s.liveCount} live of {s.machineCount} machines · joined {formatDate(s.createdAt)}
            </p>
          </Card>
        ))}
      </div>
    </AppScreen>
  )
}

export function AdminBookingsPage() {
  const bookings = useAllBookings()
  const [q, setQ] = useState('')
  const list = (bookings.data ?? []).filter((b) =>
    `${b.ref} ${b.contractor.name} ${b.supplier.name} ${b.machine.title}`
      .toLowerCase()
      .includes(q.trim().toLowerCase()),
  )
  return (
    <AppScreen root>
      <ScreenTitle
        title="Bookings"
        subtitle="All platform bookings (last 14 days of completed work)."
      />
      <SearchInput
        placeholder="Search by ref, customer or supplier..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onClear={() => setQ('')}
      />
      {bookings.isPending && <ListSkeleton rows={4} />}
      <div className="space-y-2">
        {list.map((b) => (
          <Card key={b.id} className="flex items-center gap-3 py-3">
            <Thumbnail src={thumb(b.machine.photos[0])} alt="" className="size-12" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">
                {b.ref} · {b.machine.title}
              </p>
              <p className="truncate text-muted">
                {b.contractor.name} ← {b.supplier.name}
              </p>
              <p className="text-muted">
                {formatDate(b.startDate)} – {formatDate(b.endDate)} · {formatMoney(b.totalCents)}
              </p>
            </div>
            <StatusPill
              {...(b.status === 'requested'
                ? { label: 'Requested', tone: 'warning' as const, mark: 'dot' as const }
                : dispatchPill(b))}
            />
          </Card>
        ))}
      </div>
    </AppScreen>
  )
}

export function AdminMorePage() {
  const navigate = useNavigate()
  return (
    <AppScreen root>
      <ScreenTitle title="More" subtitle="Settings and tools." />
      <div className="space-y-2">
        <ListRow
          to="/admin/approvals?tab=documents"
          leading={<FileText className="size-7 text-primary" strokeWidth={1.5} />}
          title="Document queue"
          subtitle="Verify supplier compliance documents"
        />
        <ListRow
          to="/notifications"
          leading={<CircleAlert className="size-7 text-primary" strokeWidth={1.5} />}
          title="Notifications"
          subtitle="Submissions and alerts"
        />
        <ListRow
          to="/account"
          leading={<CircleUserRound className="size-7 text-primary" strokeWidth={1.5} />}
          title="Account"
          subtitle="Profile and security"
        />
        <ListRow
          to="/support"
          leading={<LifeBuoy className="size-7 text-primary" strokeWidth={1.5} />}
          title="Support"
          subtitle="Help articles"
        />
      </div>
      <Button
        variant="danger"
        className="mt-4"
        leftIcon={<LogOut className="size-5" />}
        onClick={async () => {
          await getApi().signOut()
          navigate('/login', { replace: true })
        }}
      >
        Log Out
      </Button>
      <p className="mt-6 text-center text-xs text-subtle">SiteRun platform admin</p>
    </AppScreen>
  )
}
