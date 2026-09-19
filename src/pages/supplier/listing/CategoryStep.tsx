import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { CategoryIcon } from '@/components/domain/categoryIcons'
import { ErrorState, ListSkeleton, SearchInput } from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { selectedClass } from '@/components/ui/SelectableCard'
import { cn } from '@/lib/cn'
import { useApiMutation, useCategories } from '@/data/hooks'
import { stepPath, useListing } from './listingShared'
import { WizardFrame } from './WizardFrame'

/** Board 07 · Step 1: category. Creates the draft (new) or changes its category (existing). */
export function CategoryStep() {
  const { id } = useParams()
  const navigate = useNavigate()
  const categories = useCategories()
  const existing = useListing(id)
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const create = useApiMutation((api, categoryId: string) => api.createMachineDraft(categoryId))
  const update = useApiMutation((api, categoryId: string) =>
    api.saveMachineDraft(id ?? '', { categoryId, draftStep: 1 }),
  )

  const current =
    picked ?? existing.data?.categoryId ?? (id ? null : (categories.data?.[0]?.id ?? null))
  const list = (categories.data ?? []).filter((c) =>
    c.name.toLowerCase().includes(q.trim().toLowerCase()),
  )

  const go = (categoryId: string) => {
    setPicked(categoryId)
    if (id) update.mutate(categoryId, { onSuccess: () => navigate(stepPath(id, 'details')) })
    else
      create.mutate(categoryId, {
        onSuccess: (m) => navigate(stepPath(m.id, 'details'), { replace: true }),
      })
  }

  return (
    <WizardFrame
      step="category"
      title="Add Machine"
      subtitle="Start by selecting the machine category."
      onContinue={() => current && go(current)}
      disabled={!current}
      saving={create.isPending || update.isPending}
    >
      <SearchInput
        placeholder="Search categories..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onClear={() => setQ('')}
      />
      {categories.isPending && <ListSkeleton rows={5} thumb={false} />}
      {categories.isError && <ErrorState onRetry={() => void categories.refetch()} />}
      <ul className="space-y-2" aria-label="Machine categories">
        {list.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              aria-pressed={current === c.id}
              onClick={() => go(c.id)}
              disabled={create.isPending || update.isPending}
              className={cn(
                cardClass,
                'flex h-14 w-full items-center gap-4 px-4 text-left transition-colors hover:border-line-input',
                current === c.id && selectedClass,
              )}
            >
              <CategoryIcon icon={c.icon} className="size-8 text-primary" />
              <span className="flex-1 text-base">{c.name}</span>
              <ChevronRight className="size-5 text-[#dae4ef]" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </WizardFrame>
  )
}
