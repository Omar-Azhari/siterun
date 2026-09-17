import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, CircleCheck, ShieldCheck, TriangleAlert } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { Button, EmptyState, ErrorState, ListSkeleton, ScreenTitle, SegmentedTabs } from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { expiryLevel } from '@/lib/booking'
import { useMembers, useMyMachines, useOrgDocuments, useRequirements } from '@/data/hooks'
import type { ComplianceDocument } from '@/data/types'

/** Board 10 · Compliance Alerts (red < 21 days, amber ≤ 30 days, green otherwise). */
export function ComplianceAlertsPage() {
  const navigate = useNavigate()
  const docs = useOrgDocuments()
  const reqs = useRequirements()
  const machines = useMyMachines()
  const members = useMembers()
  const [tab, setTab] = useState<'expiring' | 'all'>('expiring')

  // Only the newest document per requirement/target counts.
  const latest = new Map<string, ComplianceDocument>()
  for (const d of docs.data ?? []) {
    const key = `${d.requirementId}:${d.machineId ?? d.profileId}`
    const cur = latest.get(key)
    if (!cur || cur.uploadedAt < d.uploadedAt) latest.set(key, d)
  }
  const rows = [...latest.values()]
    .map((d) => ({ d, ...expiryLevel(d.expiryDate) }))
    .sort((a, b) => (a.days ?? 99999) - (b.days ?? 99999))
  const expiring = rows.filter((r) => ['expired', 'critical', 'warning'].includes(r.level))
  const list = tab === 'expiring' ? expiring : rows

  const nameOf = (d: ComplianceDocument) => reqs.data?.find((r) => r.id === d.requirementId)?.name ?? 'Document'
  const targetOf = (d: ComplianceDocument) =>
    d.machineId ? machines.data?.find((m) => m.id === d.machineId)?.title : members.data?.find((m) => m.profileId === d.profileId)?.name
  const renewUrl = (d: ComplianceDocument) =>
    `/supplier/compliance/upload?type=${d.requirementId}${d.machineId ? `&machine=${d.machineId}` : `&profile=${d.profileId}`}`

  return (
    <AppScreen
      footer={
        expiring.length > 0 ? (
          <Button arrow onClick={() => expiring[0] && navigate(renewUrl(expiring[0].d))}>
            Renew Documents
          </Button>
        ) : undefined
      }
    >
      <ScreenTitle title="Compliance Alerts" subtitle="Keep your documents up to date and avoid downtime." />
      <SegmentedTabs
        label="Documents"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'expiring', label: 'Expiring Soon', count: expiring.length },
          { value: 'all', label: 'All Documents' },
        ]}
      />
      <ul className="mt-3 space-y-2" role="tabpanel">
        {docs.isPending && <ListSkeleton rows={4} thumb={false} />}
        {docs.isError && <ErrorState onRetry={() => void docs.refetch()} />}
        {docs.data && list.length === 0 && <EmptyState icon={<ShieldCheck strokeWidth={1.75} />} title="Nothing expiring" description="All your documents are current." />}
        {list.map(({ d, days, level }) => {
          const bad = level === 'expired' || level === 'critical'
          const warn = level === 'warning'
          return (
            <li key={d.id}>
              <button type="button" onClick={() => navigate(renewUrl(d))} className={cn(cardClass, 'flex w-full items-center gap-3 p-3 text-left hover:border-line-input')}>
                {bad || warn ? (
                  <TriangleAlert className={cn('size-8 shrink-0', bad ? 'text-danger' : 'text-warning')} strokeWidth={1.5} aria-hidden />
                ) : (
                  <CircleCheck className="size-8 shrink-0 text-success" strokeWidth={1.5} aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{nameOf(d)}</span>
                  {targetOf(d) && <span className="block truncate text-xs text-muted">{targetOf(d)}</span>}
                  {bad || warn ? (
                    <span className={cn('block text-sm', bad ? 'text-[#f87171]' : 'text-[#f7b84b]')}>
                      {level === 'expired' ? `Expired ${-(days ?? 0)} days ago` : `Expires in ${days} days`}
                    </span>
                  ) : (
                    <span className="block text-sm text-muted">{d.expiryDate ? `Valid until ${formatDate(d.expiryDate)}` : 'No expiry'}</span>
                  )}
                  {(bad || warn) && d.expiryDate && <span className="block text-xs text-muted">{formatDate(d.expiryDate)}</span>}
                </span>
                <ChevronRight className="size-5 text-muted" aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </AppScreen>
  )
}
