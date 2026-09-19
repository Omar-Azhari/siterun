import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  Construction,
  MapPin,
  Plus,
  SlidersHorizontal,
  UsersRound,
} from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import {
  BottomSheet,
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  IconButton,
  ListSkeleton,
  ScreenTitle,
  SearchInput,
  SelectableCard,
  StatusPill,
  Thumbnail,
} from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { useSites } from '@/data/hooks'
import type { SiteStatus } from '@/data/types'

const STATUS_FILTERS: { value: SiteStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All sites' },
  { value: 'active', label: 'Active' },
  { value: 'planning', label: 'Planning' },
  { value: 'on_hold', label: 'On Hold' },
]

/** Board 02 · Your Sites */
export function SitesPage() {
  const sites = useSites()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<SiteStatus | 'all'>('all')
  const [open, setOpen] = useState(false)

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (sites.data ?? [])
      .filter((s) => filter === 'all' || s.status === filter)
      .filter((s) => !t || `${s.name} ${s.suburb} ${s.address}`.toLowerCase().includes(t))
  }, [sites.data, q, filter])

  return (
    <AppScreen root>
      <ScreenTitle title="Your Sites" subtitle="Manage all your project sites in one place." />
      <ButtonLink to="/sites/new/location" leftIcon={<Plus className="size-5" />}>
        Add New Site
      </ButtonLink>
      <div className="mt-3 flex gap-2">
        <SearchInput
          className="mb-0 flex-1"
          placeholder="Search sites..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onClear={() => setQ('')}
        />
        <IconButton
          label={`Filter sites${filter !== 'all' ? ' (1 active)' : ''}`}
          onClick={() => setOpen(true)}
          className="size-12 border border-line-input bg-input"
        >
          <SlidersHorizontal className="size-5" />
          {filter !== 'all' && (
            <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
          )}
        </IconButton>
      </div>

      <div className="mt-3 space-y-2.5">
        {sites.isPending && <ListSkeleton rows={3} />}
        {sites.isError && <ErrorState onRetry={() => void sites.refetch()} />}
        {sites.data && list.length === 0 && (
          <EmptyState
            icon={<MapPin strokeWidth={1.75} />}
            title={sites.data.length ? 'No sites match' : 'No sites yet'}
            description={
              sites.data.length
                ? 'Try a different search or filter.'
                : 'Add your first project site to start hiring equipment.'
            }
          />
        )}
        {list.map((s) => (
          <Link
            key={s.id}
            to={`/sites/${s.id}`}
            className={cn(cardClass, 'block p-3 transition-colors hover:border-line-input')}
          >
            <div className="flex gap-3">
              <Thumbnail src={s.photoUrl} alt={s.name} className="h-[72px] w-[84px]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{s.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-[#dae4ef]">
                  <MapPin className="size-3.5 text-primary" aria-hidden />
                  {s.suburb}, {s.state}
                </p>
                <StatusPill status={s.status} className="mt-1.5" />
              </div>
              <ChevronRight className="size-5 self-center text-muted" aria-hidden />
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs text-muted">
              <p className="flex items-center gap-2">
                <Construction className="size-5 text-[#dae4ef]" strokeWidth={1.5} aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-fg">{s.activeHires}</span>Active
                  hires
                </span>
              </p>
              <p className="flex items-center gap-2">
                <UsersRound className="size-5 text-[#dae4ef]" strokeWidth={1.5} aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-fg">{s.teamCount}</span>Team
                  members
                </span>
              </p>
            </div>
          </Link>
        ))}
      </div>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filter sites"
        footer={<Button onClick={() => setOpen(false)}>Show {list.length} sites</Button>}
      >
        <div role="radiogroup" aria-label="Site status" className="space-y-2">
          {STATUS_FILTERS.map((f) => (
            <SelectableCard
              key={f.value}
              selected={filter === f.value}
              onSelect={() => setFilter(f.value)}
              title={f.label}
            />
          ))}
        </div>
      </BottomSheet>
    </AppScreen>
  )
}
