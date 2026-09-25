import { useState } from 'react'
import { AppScreen } from '@/components/layout/AppScreen'
import {
  Card,
  EmptyState,
  ErrorState,
  ListSkeleton,
  ScreenTitle,
  SectionLabel,
  SegmentedTabs,
  StatTile,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import type { TimeRange } from '@/data/api'
import { useAnalytics } from '@/data/hooks'

const RANGES: { value: TimeRange; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
]

/** One step of the search → view → book funnel, sized against the widest step. */
function FunnelStep({ label, value, of }: { label: string; value: number; of: number }) {
  const pct = of > 0 ? Math.max(4, Math.round((value / of) * 100)) : 0
  return (
    <div className="mt-2.5 first:mt-0">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-semibold">{value.toLocaleString('en-AU')}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-white/[0.07]">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Bars({ items }: { items: { label: string; count: number }[] }) {
  const top = Math.max(...items.map((i) => i.count), 1)
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 truncate">{i.label}</span>
          <span className="h-2 flex-1 rounded-full bg-white/[0.07]">
            <span
              className="block h-2 rounded-full bg-primary/70"
              style={{ width: `${Math.max(4, Math.round((i.count / top) * 100))}%` }}
            />
          </span>
          <span className="w-10 shrink-0 text-right text-muted">{i.count}</span>
        </div>
      ))}
    </div>
  )
}

/** What people search for, what they look at, and where that stops turning into hires. */
export function AdminAnalyticsPage() {
  const [range, setRange] = useState<TimeRange>('30d')
  const q = useAnalytics(range)
  const a = q.data

  return (
    <AppScreen>
      <ScreenTitle title="Analytics" subtitle="Where searches turn into hires." />
      <SegmentedTabs label="Date range" options={RANGES} value={range} onChange={setRange} />
      {q.isError && <ErrorState className="mt-3" onRetry={() => void q.refetch()} />}
      {q.isPending && <ListSkeleton rows={4} thumb={false} />}
      {a && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <StatTile
              layout="stack"
              label="Searches"
              value={a.searches.toLocaleString('en-AU')}
              trend={a.searchTrend}
            />
            <StatTile
              layout="stack"
              label="Bookings"
              value={a.bookings.toLocaleString('en-AU')}
              trend={a.bookingTrend}
            />
            <StatTile layout="stack" label="View → booking" value={`${a.viewToBooking}%`} />
            <StatTile
              layout="stack"
              label="Organisations"
              value={a.organisations.toLocaleString('en-AU')}
            />
          </div>

          <SectionLabel>Funnel</SectionLabel>
          <Card>
            <FunnelStep label="Searches" value={a.searches} of={a.searches} />
            <FunnelStep label="Machines viewed" value={a.views} of={a.searches} />
            <FunnelStep label="Booking started" value={a.bookStarts} of={a.searches} />
            <FunnelStep label="Booked" value={a.bookings} of={a.searches} />
          </Card>

          <SectionLabel>Top searches</SectionLabel>
          {a.topSearches.length ? (
            <Card>
              <Bars items={a.topSearches} />
            </Card>
          ) : (
            <EmptyState
              title="No searches yet"
              description="They'll appear here as people search."
            />
          )}

          {a.topCategories.length > 0 && (
            <>
              <SectionLabel>Categories searched</SectionLabel>
              <Card>
                <Bars items={a.topCategories} />
              </Card>
            </>
          )}

          {a.topMachines.length > 0 && (
            <>
              <SectionLabel>Most viewed machines</SectionLabel>
              <div className="space-y-2">
                {a.topMachines.map((m) => (
                  <Card key={m.id} className="flex items-center gap-3 py-3 text-sm">
                    <span className="min-w-0 flex-1 truncate">{m.label}</span>
                    <span className="text-muted">{m.views} views</span>
                    <span
                      className={cn(
                        'font-semibold',
                        m.bookings > 0 ? 'text-success' : 'text-subtle',
                      )}
                    >
                      {m.bookings} booked
                    </span>
                  </Card>
                ))}
              </div>
            </>
          )}
          <p className="mt-4 text-xs text-subtle">
            Counts only, kept for 180 days. No third-party analytics service is used.
          </p>
        </>
      )}
    </AppScreen>
  )
}
