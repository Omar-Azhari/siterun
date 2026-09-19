import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronDown, SearchX, SlidersHorizontal } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { MachineCard } from '@/components/domain/MachineBits'
import {
  activeFilterCount,
  filtersFromParams,
  paramsFromFilters,
} from '@/components/domain/searchParams'
import { Button, EmptyState, ErrorState, ListSkeleton, ScreenTitle } from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { useCategories, useSearch } from '@/data/hooks'
import type { SearchFilters } from '@/data/types'

const SORTS: { value: NonNullable<SearchFilters['sort']>; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Supplier rating' },
]

/** Board 03 · Search Results */
export function SearchResultsPage() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => ({ ...filtersFromParams(params), pageSize: 10 }), [params])
  const results = useSearch(filters)
  const categories = useCategories()
  const count = activeFilterCount(filters)
  const site = params.get('site')

  const patch = (p: SearchFilters) => {
    const next = paramsFromFilters({ ...filters, ...p })
    if (site) next.set('site', site)
    setParams(next, { replace: true })
  }

  const place = filters.location ?? 'you'
  const catName = categories.data?.find((c) => c.slug === filters.categorySlug)?.name
  const total = results.data?.total ?? 0
  const page = results.data?.page ?? 1
  const pageSize = results.data?.pageSize ?? 10
  const from = total ? (page - 1) * pageSize + 1 : 0
  const to = Math.min(total, page * pageSize)
  const editHref = `/search?${params.toString()}`
  const detailSuffix = (() => {
    const p = new URLSearchParams()
    if (filters.startDate) p.set('start', filters.startDate)
    if (filters.endDate) p.set('end', filters.endDate)
    if (filters.hireType) p.set('hire', filters.hireType)
    if (site) p.set('site', site)
    const s = p.toString()
    return s ? `?${s}` : ''
  })()

  return (
    <AppScreen>
      <ScreenTitle
        title={catName ? catName : 'Search Results'}
        subtitle={
          results.data ? `${total} machine${total === 1 ? '' : 's'} near ${place}` : 'Searching…'
        }
      />
      <div className="mb-3 flex gap-2">
        <label
          className={cn(
            cardClass,
            'relative flex h-14 flex-1 flex-col justify-center rounded-[10px] px-3',
          )}
        >
          <span className="text-[11px] text-muted">Sort by</span>
          <span className="text-sm font-medium">
            {SORTS.find((s) => s.value === (filters.sort ?? 'relevance'))?.label}
          </span>
          <ChevronDown className="absolute right-3 size-4" aria-hidden />
          <select
            aria-label="Sort by"
            value={filters.sort ?? 'relevance'}
            onChange={(e) => patch({ sort: e.target.value as SearchFilters['sort'], page: 1 })}
            className="absolute inset-0 cursor-pointer opacity-0 [&>option]:bg-card"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <Link
          to={editHref}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[10px] border border-primary bg-selected text-sm font-medium text-primary"
        >
          Filters{count ? ` (${count})` : ''}
          <SlidersHorizontal className="size-5" aria-hidden />
        </Link>
      </div>

      {results.isPending && <ListSkeleton rows={4} />}
      {results.isError && <ErrorState onRetry={() => void results.refetch()} />}
      {results.data && total === 0 && (
        <EmptyState
          icon={<SearchX strokeWidth={1.75} />}
          title="No machines found"
          description="Try other dates, a wider price range or a different location."
          action={
            <Button
              size="md"
              onClick={() =>
                setParams(
                  new URLSearchParams(
                    filters.categorySlug ? { category: filters.categorySlug } : {},
                  ),
                )
              }
            >
              Clear filters
            </Button>
          }
        />
      )}
      <ul
        className={cn('space-y-2.5', results.isFetching && 'opacity-70')}
        aria-busy={results.isFetching}
      >
        {results.data?.items.map((m) => (
          <li key={m.id}>
            <MachineCard machine={m} to={`/machines/${m.id}${detailSuffix}`} />
          </li>
        ))}
      </ul>
      {total > 0 && (
        <nav aria-label="Results pages" className="mt-4 flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="secondary"
            block={false}
            disabled={page <= 1}
            onClick={() => patch({ page: page - 1 })}
          >
            Previous
          </Button>
          <p className="text-center text-[13px] text-muted" aria-live="polite">
            Showing {from}–{to} of {total} results
          </p>
          <Button
            size="sm"
            variant="secondary"
            block={false}
            disabled={to >= total}
            onClick={() => patch({ page: page + 1 })}
          >
            Next
          </Button>
        </nav>
      )}
    </AppScreen>
  )
}
