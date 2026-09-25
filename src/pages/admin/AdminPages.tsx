import { thumb } from '@/lib/images'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  Building2,
  Bug,
  CalendarDays,
  ChartLine,
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
  DateField,
  EmptyState,
  ErrorState,
  ListRow,
  ListSkeleton,
  Input,
  ScreenTitle,
  SearchInput,
  Select,
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
  useBooking,
  useAllBookings,
  useApiMutation,
  useCategories,
  useClientErrors,
  useDocuments,
  useMachine,
  usePendingDocuments,
  usePendingMachines,
  useRefundablePayments,
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
  booking_cancelled: 'bg-danger',
  booking_adjusted: 'bg-warning',
  refund: 'bg-warning',
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
  const navigate = useNavigate()
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
          <Card
            key={b.id}
            role="link"
            tabIndex={0}
            onClick={() => navigate(`/admin/bookings/${b.id}`)}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/bookings/${b.id}`)}
            className="flex cursor-pointer items-center gap-3 py-3 hover:border-primary/40"
          >
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
          to="/admin/analytics"
          leading={<ChartLine className="size-7 text-primary" strokeWidth={1.5} />}
          title="Analytics"
          subtitle="Searches, views and bookings"
        />
        <ListRow
          to="/admin/errors"
          leading={<Bug className="size-7 text-primary" strokeWidth={1.5} />}
          title="App errors"
          subtitle="Crashes reported by the website and apps"
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

/** Errors reported by the website and apps (lib/errorReporting.ts), newest first. */
export function AdminErrorsPage() {
  const q = useClientErrors()
  return (
    <AppScreen>
      <ScreenTitle title="App errors" subtitle="Reported automatically. Kept for 90 days." />
      {q.isPending ? (
        <ListSkeleton rows={4} thumb={false} />
      ) : q.isError ? (
        <ErrorState onRetry={() => void q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState
          icon={<Bug strokeWidth={1.75} />}
          title="No errors reported"
          description="Crashes on the website or in the apps will show up here."
        />
      ) : (
        <div className="space-y-2">
          {q.data.map((e) => (
            <Card key={e.id} className="text-sm">
              <p className="line-clamp-3 font-medium break-words">{e.message}</p>
              <p className="mt-1 text-xs text-muted">
                {e.count}× · {e.platform || 'web'}
                {e.release && ` · v${e.release}`} · {e.signedIn ? 'signed in' : 'signed out'} · last{' '}
                {timeAgo(e.lastSeen)}
              </p>
              {e.url && (
                <p className="mt-1 truncate text-xs text-subtle">
                  {new URL(e.url, window.location.origin).pathname}
                </p>
              )}
              {e.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-primary">Stack trace</summary>
                  <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-black/30 p-2 text-[11px] leading-snug whitespace-pre-wrap text-muted">
                    {e.stack}
                  </pre>
                </details>
              )}
            </Card>
          ))}
        </div>
      )}
    </AppScreen>
  )
}

/** Platform admin tools for one booking: cancel it, change it, or refund a payment. */
export function AdminBookingDetailPage() {
  const { id = '' } = useParams()
  const q = useBooking(id)
  const payments = useRefundablePayments(id)
  const [sheet, setSheet] = useState<'cancel' | 'adjust' | 'refund' | null>(null)
  const [reason, setReason] = useState('')
  const [endDate, setEndDate] = useState('')
  const [total, setTotal] = useState('')
  const [paymentId, setPaymentId] = useState('')
  const [amount, setAmount] = useState('')
  const b = q.data

  const close = () => {
    setSheet(null)
    setReason('')
  }
  const cancel = useApiMutation(
    (api, v: { id: string; reason: string }) => api.adminCancelBooking(v.id, v.reason),
    {
      success: 'Hire cancelled and both parties told',
    },
  )
  const adjust = useApiMutation(
    (api, v: { id: string; change: { endDate?: string; totalCents?: number }; reason: string }) =>
      api.adminAdjustBooking(v.id, v.change, v.reason),
    { success: 'Hire updated' },
  )
  const refund = useApiMutation(
    (api, v: { paymentId: string; amountCents: number; reason: string }) =>
      api.adminRefund(v.paymentId, v.amountCents, v.reason),
    { success: 'Refund issued' },
  )

  if (q.isPending) {
    return (
      <AppScreen>
        <ListSkeleton rows={3} />
      </AppScreen>
    )
  }
  if (!b) {
    return (
      <AppScreen>
        <EmptyState title="Booking not found" />
      </AppScreen>
    )
  }

  const live = !['cancelled', 'completed', 'declined'].includes(b.status)
  const selected = (payments.data ?? []).find((p) => p.id === paymentId)
  const maxRefund = selected ? (selected.amountCents - selected.refundedCents) / 100 : 0

  return (
    <AppScreen>
      <ScreenTitle
        title={`${b.ref}`}
        subtitle={`${b.machine.title} · ${b.machine.make} ${b.machine.model}`}
      />
      <div className="mb-2 flex items-center justify-between">
        <StatusPill
          {...(b.status === 'requested'
            ? { label: 'Requested', tone: 'warning' as const, mark: 'dot' as const }
            : dispatchPill(b))}
          size="md"
        />
        <span className="text-sm text-muted">{formatMoney(b.totalCents)} ex. GST</span>
      </div>
      <Card className="space-y-2 text-sm">
        <p className="flex justify-between gap-3">
          <span className="text-muted">Customer</span>
          <span className="text-right font-medium">{b.contractor.name}</span>
        </p>
        <p className="flex justify-between gap-3">
          <span className="text-muted">Supplier</span>
          <span className="text-right font-medium">{b.supplier.name}</span>
        </p>
        <p className="flex justify-between gap-3">
          <span className="text-muted">Dates</span>
          <span className="text-right">
            {formatDate(b.startDate)} – {formatDate(b.endDate)}
          </span>
        </p>
        <p className="flex justify-between gap-3">
          <span className="text-muted">Site</span>
          <span className="text-right">{b.deliveryAddress}</span>
        </p>
        {b.declineReason && (
          <p className="flex justify-between gap-3">
            <span className="text-muted">Reason</span>
            <span className="text-right">{b.declineReason}</span>
          </p>
        )}
      </Card>

      <SectionLabel>Platform actions</SectionLabel>
      <div className="space-y-2">
        <Button
          variant="secondary"
          size="md"
          block
          disabled={!live}
          onClick={() => setSheet('adjust')}
        >
          Change Dates or Total
        </Button>
        <Button
          variant="secondary"
          size="md"
          block
          disabled={!payments.data?.length}
          onClick={() => {
            setPaymentId(payments.data?.[0]?.id ?? '')
            setAmount('')
            setSheet('refund')
          }}
        >
          {payments.data?.length ? 'Refund a Payment' : 'Nothing to refund'}
        </Button>
        <Button
          variant="danger"
          size="md"
          block
          disabled={!live}
          onClick={() => setSheet('cancel')}
        >
          Cancel Hire
        </Button>
      </div>
      <p className="mt-3 text-xs text-subtle">
        Every action here is recorded in the activity feed, and both organisations are told what
        changed.
      </p>

      <BottomSheet
        open={sheet === 'cancel'}
        onClose={close}
        title="Cancel this hire"
        footer={
          <Button
            variant="danger"
            disabled={reason.trim().length < 5}
            loading={cancel.isPending}
            onClick={() => cancel.mutate({ id: b.id, reason }, { onSuccess: close })}
          >
            Cancel Hire
          </Button>
        }
      >
        <Textarea
          label="Why is it being cancelled?"
          hint="Both the customer and the supplier see this."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === 'adjust'}
        onClose={close}
        title="Change this hire"
        footer={
          <Button
            disabled={reason.trim().length < 5 || (!endDate && !total)}
            loading={adjust.isPending}
            onClick={() =>
              adjust.mutate(
                {
                  id: b.id,
                  change: {
                    ...(endDate ? { endDate } : {}),
                    ...(total ? { totalCents: Math.round(Number(total) * 100) } : {}),
                  },
                  reason,
                },
                {
                  onSuccess: () => {
                    setEndDate('')
                    setTotal('')
                    close()
                  },
                },
              )
            }
          >
            Save Change
          </Button>
        }
      >
        <DateField
          label="New end date"
          hint={`Currently ${formatDate(b.endDate)}`}
          value={endDate}
          onChange={setEndDate}
        />
        <Input
          label="New total (ex. GST)"
          inputMode="decimal"
          hint={`Currently ${formatMoney(b.totalCents)}`}
          placeholder={(b.totalCents / 100).toFixed(2)}
          value={total}
          onChange={(e) => setTotal(e.target.value.replace(/[^\d.]/g, ''))}
        />
        <Textarea
          label="Why is it being changed?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === 'refund'}
        onClose={close}
        title="Refund a payment"
        footer={
          <Button
            disabled={
              !paymentId ||
              !amount ||
              Number(amount) <= 0 ||
              Number(amount) > maxRefund ||
              reason.trim().length < 5
            }
            loading={refund.isPending}
            onClick={() =>
              refund.mutate(
                { paymentId, amountCents: Math.round(Number(amount) * 100), reason },
                {
                  onSuccess: () => {
                    setAmount('')
                    close()
                  },
                },
              )
            }
          >
            Refund {amount ? formatMoney(Math.round(Number(amount) * 100), { cents: true }) : ''}
          </Button>
        }
      >
        <Select
          label="Payment"
          value={paymentId}
          onChange={(e) => setPaymentId(e.target.value)}
          options={(payments.data ?? []).map((p) => ({
            value: p.id,
            label: `${formatMoney(p.amountCents, { cents: true })} · ${p.description || p.kind} · ${formatDate(p.createdAt)}`,
          }))}
        />
        <Input
          label="Amount to refund"
          inputMode="decimal"
          hint={`Up to ${formatMoney(Math.round(maxRefund * 100), { cents: true })}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
        />
        <Textarea
          label="Why is it being refunded?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </BottomSheet>
    </AppScreen>
  )
}
