import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays, ChartColumn, ChevronRight, Gauge, Plus, ShieldAlert, Inbox } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { Card, ErrorState, ProgressBar, ScreenTitle, SectionLabel, SegmentedTabs, Skeleton, StatTile } from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { formatMoneyCompact } from '@/lib/format'
import { expiryLevel } from '@/lib/booking'
import { useOrgDocuments, usePerformance, useSupplierBookings } from '@/data/hooks'

type Range = '30d' | '90d' | '1y'

function Shortcuts() {
  const bookings = useSupplierBookings()
  const docs = useOrgDocuments()
  const requests = bookings.data?.filter((b) => b.status === 'requested').length ?? 0
  const alerts = docs.data?.filter((d) => d.status === 'verified' && ['critical', 'warning', 'expired'].includes(expiryLevel(d.expiryDate).level)).length ?? 0
  const items = [
    { to: '/supplier/requests', icon: Inbox, label: 'Booking Requests', badge: requests },
    { to: '/supplier/machines/new/category', icon: Plus, label: 'Add Machine', badge: 0 },
    { to: '/supplier/compliance/alerts', icon: ShieldAlert, label: 'Compliance Alerts', badge: alerts },
  ]
  return (
    <ul className="mb-4 grid grid-cols-3 gap-2">
      {items.map((i) => (
        <li key={i.to}>
          <Link to={i.to} className={cn(cardClass, 'relative flex h-full flex-col items-center gap-1.5 px-2 py-3 text-center text-[13px] leading-tight hover:border-line-input')}>
            <i.icon className="size-7 text-primary" strokeWidth={1.5} aria-hidden />
            {i.label}
            {i.badge > 0 && (
              <span className="absolute top-2 right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold">
                {i.badge}
                <span className="sr-only"> new</span>
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Board 10 · Performance (also the supplier Home, with shortcuts). */
export function PerformancePage() {
  const { pathname } = useLocation()
  const home = pathname === '/supplier'
  const [range, setRange] = useState<Range>('30d')
  const perf = usePerformance(range)
  const p = perf.data
  const tickEvery = range === '30d' ? 7 : range === '90d' ? 3 : 2

  return (
    <AppScreen root>
      {home && (
        <>
          <ScreenTitle title="Home" subtitle="Your fleet at a glance." className="mb-3" />
          <Shortcuts />
        </>
      )}
      <ScreenTitle title="Performance" subtitle="Your equipment performance at a glance." />
      <SegmentedTabs
        label="Time range"
        value={range}
        onChange={setRange}
        options={[
          { value: '30d', label: '30D' },
          { value: '90d', label: '90D' },
          { value: '1y', label: '1Y' },
        ]}
      />
      {perf.isError && <ErrorState className="mt-3" onRetry={() => void perf.refetch()} />}
      <div className="mt-3 grid grid-cols-2 gap-2.5" aria-busy={perf.isFetching}>
        {p ? (
          <>
            <StatTile icon={<CalendarDays strokeWidth={1.5} />} label="Hires" value={p.hires} trend={p.hiresTrend} />
            <StatTile icon={<Gauge strokeWidth={1.5} />} label="Utilisation" value={`${p.utilisation}%`} trend={p.utilisationTrend} />
            <StatTile icon={<ChartColumn strokeWidth={1.5} />} label="Revenue" value={formatMoneyCompact(p.revenueCents)} trend={p.revenueTrend} className="col-span-2" />
          </>
        ) : (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="col-span-2 h-24" />
          </>
        )}
      </div>

      <SectionLabel action={<Link to="/supplier/bookings">View all ›</Link>}>Hire Trend</SectionLabel>
      <Card className="px-1 pt-3 pb-1">
        {p ? (
          <figure aria-label={`Hires per ${range === '1y' ? 'month' : range === '90d' ? 'week' : 'day'}. Peak ${Math.max(...p.trend.map((t) => t.hires))}.`}>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={p.trend} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid vertical={false} stroke="#1a2d3e" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={tickEvery - 1} tick={{ fill: '#aeb9c9', fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#aeb9c9', fontSize: 11 }} width={40} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#04182b', border: '1px solid #2a3f50', borderRadius: 10, color: '#fff' }} labelStyle={{ color: '#aeb9c9' }} />
                <Bar dataKey="hires" name="Hires" fill="#006cff" radius={[3, 3, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </figure>
        ) : (
          <Skeleton className="h-[170px]" />
        )}
      </Card>

      <SectionLabel action={<Link to="/supplier/machines">View all ›</Link>}>Top Performing Machines</SectionLabel>
      <Card className="space-y-3">
        {p?.topMachines.length === 0 && <p className="text-sm text-muted">No hires in this period yet.</p>}
        {p?.topMachines.map((t, i) => (
          <Link key={t.machineId} to={`/supplier/machines/${t.machineId}`} className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#34445a] text-sm font-semibold">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="flex justify-between text-[15px]">
                <span className="truncate font-medium">{t.title}</span>
                <span className="shrink-0 text-xs text-muted">{t.hires} hires</span>
              </span>
              <span className="mt-1 flex items-center gap-2">
                <ProgressBar value={t.utilisation} label={`${t.title} utilisation`} />
                <span className="w-10 text-right text-xs">{t.utilisation}%</span>
              </span>
            </span>
            <ChevronRight className="size-4 text-muted" aria-hidden />
          </Link>
        ))}
      </Card>
    </AppScreen>
  )
}
