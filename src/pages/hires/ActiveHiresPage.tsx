import { thumb } from '@/lib/images'
import { useState } from 'react'
import { BriefcaseBusiness } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { hirePill } from '@/components/domain/bookingStatus'
import {
  ButtonLink,
  EmptyState,
  ErrorState,
  ListRow,
  ListSkeleton,
  ScreenTitle,
  SegmentedTabs,
  StatusPill,
  Thumbnail,
} from '@/components/ui'
import { useActiveHires } from '@/data/hooks'

type Tab = 'all' | 'site' | 'transit'

/** Board 04 · Active Hires */
export function ActiveHiresPage() {
  const hires = useActiveHires()
  const [tab, setTab] = useState<Tab>('all')
  const all = hires.data ?? []
  const onSite = all.filter((b) => b.status === 'on_site' || b.status === 'return_scheduled')
  const transit = all.filter((b) => b.status === 'in_transit')
  const list = tab === 'all' ? all : tab === 'site' ? onSite : transit

  return (
    <AppScreen root>
      <ScreenTitle title="Active Hires" subtitle="Manage all your live equipment across sites." />
      <SegmentedTabs
        label="Filter hires"
        value={tab}
        onChange={setTab}
        idPrefix="hires"
        options={[
          { value: 'all', label: 'All', count: all.length },
          { value: 'site', label: 'On Site', count: onSite.length },
          { value: 'transit', label: 'In Transit', count: transit.length },
        ]}
      />
      <div id="hires-panel" role="tabpanel" className="mt-3 space-y-2.5">
        {hires.isPending && <ListSkeleton rows={4} />}
        {hires.isError && <ErrorState onRetry={() => void hires.refetch()} />}
        {hires.data && list.length === 0 && (
          <EmptyState
            icon={<BriefcaseBusiness strokeWidth={1.75} />}
            title={all.length ? 'Nothing in this view' : 'No active hires'}
            description={
              all.length
                ? 'Try another tab.'
                : 'Machines you hire will appear here once they’re on the way.'
            }
            action={
              !all.length ? (
                <ButtonLink to="/browse" size="md" block>
                  Browse equipment
                </ButtonLink>
              ) : undefined
            }
          />
        )}
        {list.map((b) => (
          <ListRow
            key={b.id}
            to={`/hires/${b.id}`}
            leading={
              <Thumbnail
                src={thumb(b.machine.photos[0])}
                alt={b.machine.title}
                className="h-[84px] w-[72px]"
              />
            }
            title={b.machine.title}
            subtitle={`${b.machine.make} ${b.machine.model}`}
            meta={
              <>
                <span className="block text-[#dae4ef]">{b.site?.name}</span>
                {b.site?.suburb}, {b.site?.state}
              </>
            }
            trailing={<StatusPill {...hirePill(b)} />}
          />
        ))}
      </div>
    </AppScreen>
  )
}
