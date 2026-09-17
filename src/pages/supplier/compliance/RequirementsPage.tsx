import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { BottomSheet, Button, ErrorState, InfoNote, ListSkeleton, ScreenTitle, SelectableCard, StatusPill, Thumbnail } from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { useCategories, useMembers, useMyMachines, useRequirements } from '@/data/hooks'
import type { ComplianceRequirement } from '@/data/types'
import { RequirementIcon } from './complianceShared'

const COPY = {
  general: { title: 'General Plant\nDocument Requirements', subtitle: 'These documents are required for most plant and equipment.', next: '/supplier/compliance/requirements/crane' },
  crane: { title: 'Crane Document\nRequirements', subtitle: 'Cranes require additional documentation to ensure safety and compliance.', next: '/supplier/compliance/requirements/operator' },
  operator: { title: 'Operator Compliance\nDocuments', subtitle: 'Ensure operators are qualified and authorised.', next: '/supplier/compliance' },
} as const

type Group = keyof typeof COPY

/** Board 08 · screens 3–5: requirement lists (driven by the compliance_requirements config). */
export function RequirementsPage() {
  const { group } = useParams()
  const navigate = useNavigate()
  const reqs = useRequirements()
  const machines = useMyMachines()
  const members = useMembers()
  const categories = useCategories()
  const [target, setTarget] = useState<ComplianceRequirement | null>(null)
  if (!group || !(group in COPY)) return <Navigate to="/supplier/compliance" replace />
  const g = group as Group
  const copy = COPY[g]
  const list = (reqs.data ?? []).filter((r) => r.group === g)

  // Which listings a requirement applies to (crane docs only for crane categories).
  const eligible = (machines.data ?? []).filter((m) => {
    const cat = categories.data?.find((c) => c.id === m.categoryId)
    return g === 'crane' ? cat?.requirementGroups.includes('crane') : true
  })
  const operators = (members.data ?? []).filter((m) => m.profileId)

  return (
    <AppScreen footer={<Button arrow onClick={() => navigate(copy.next)}>Continue</Button>}>
      <ScreenTitle title={<span className="whitespace-pre-line">{copy.title}</span>} subtitle={copy.subtitle} />
      {reqs.isPending && <ListSkeleton rows={4} thumb={false} />}
      {reqs.isError && <ErrorState onRetry={() => void reqs.refetch()} />}
      <ul className="space-y-2">
        {list.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => setTarget(r)} className={cn(cardClass, 'flex w-full items-center gap-4 p-4 text-left hover:border-line-input')}>
              <span className="text-primary">
                <RequirementIcon icon={r.icon} className="size-9" />
              </span>
              <span className="flex-1">
                <span className="block text-base font-semibold">
                  {r.name}
                  {!r.required && <span className="ml-1.5 text-xs font-normal text-muted">Optional</span>}
                </span>
                <span className="mt-0.5 block text-sm text-muted">{r.description}</span>
              </span>
              <ChevronRight className="size-5 text-[#dae4ef]" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {g === 'general' && <InfoNote className="mt-3">Exact requirements may vary by state and machine type.</InfoNote>}

      <BottomSheet open={!!target} onClose={() => setTarget(null)} title={target ? `Upload ${target.name}` : ''}>
        <p className="mb-3 text-sm text-muted">{g === 'operator' ? 'Who is this document for?' : 'Which machine is this document for?'}</p>
        <div className="space-y-2">
          {g === 'operator'
            ? operators.map((o) => (
                <SelectableCard
                  key={o.id}
                  selected={false}
                  indicator="none"
                  onSelect={() => target && navigate(`/supplier/compliance/upload?type=${target.id}&profile=${o.profileId}`)}
                  title={o.name}
                  description={o.email}
                  aside={<ChevronRight className="size-5 text-muted" />}
                />
              ))
            : eligible.map((m) => (
                <SelectableCard
                  key={m.id}
                  selected={false}
                  indicator="none"
                  onSelect={() => target && navigate(`/supplier/compliance/upload?type=${target.id}&machine=${m.id}`)}
                  icon={<Thumbnail src={m.photos[0]?.replace('.webp', '-sm.webp')} alt="" className="size-11" />}
                  title={m.title}
                  description={`${m.make} ${m.model}`}
                  aside={<StatusPill status={m.status} />}
                />
              ))}
          {g !== 'operator' && eligible.length === 0 && <p className="text-sm text-muted">No matching machines yet. Add a machine first.</p>}
        </div>
      </BottomSheet>
    </AppScreen>
  )
}
