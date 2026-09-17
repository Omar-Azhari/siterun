import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format, isToday, parseISO } from 'date-fns'
import { Marker, Polyline, Tooltip } from 'react-leaflet'
import { AppScreen } from '@/components/layout/AppScreen'
import { BaseMap, FitBounds } from '@/components/domain/maps/MapParts'
import { dotIcon, pointAlong, truckIcon } from '@/components/domain/maps/mapUtils'
import { EmptyState, Skeleton, Timeline, type TimelineStep } from '@/components/ui'
import { getApi } from '@/data/client'
import { useDelivery } from '@/data/hooks'
import type { Delivery } from '@/data/types'
import { HireGate } from './HireGate'
import { HireMachineCard } from './HireMachineCard'
import { useHire } from './hireShared'

const when = (iso: string) => `${isToday(parseISO(iso)) ? 'Today' : format(parseISO(iso), 'EEE d MMM')}, ${format(parseISO(iso), 'h:mm a')}`

/** Board 04 · Live Delivery Tracking (simulated GPS in demo, Realtime with Supabase). */
export function TrackingPage() {
  const { id } = useParams()
  const { q, b, state } = useHire(id)
  const initial = useDelivery(id)
  const [live, setLive] = useState<Delivery | null>(null)
  const d = live ?? initial.data ?? null

  useEffect(() => {
    if (!id) return
    return getApi().subscribeDelivery(id, setLive)
  }, [id])

  const truck = useMemo(() => (d ? pointAlong(d.route, d.progress) : null), [d])
  if (!b) return <HireGate state={state} retry={() => void q.refetch()} />

  const steps: TimelineStep[] = d
    ? [
        { title: 'Picked up from supplier', state: 'done', details: [d.pickedUpAt ? when(d.pickedUpAt) : '', d.origin.label] },
        {
          title: 'In transit',
          state: d.stage === 'in_transit' ? 'current' : 'done',
          details: [d.stage === 'in_transit' ? <span key="l" className="text-primary">Live location</span> : 'Completed'],
        },
        {
          title: 'Arriving at site',
          state: d.stage === 'arriving' ? 'current' : d.stage === 'delivered' ? 'done' : 'upcoming',
          details: [when(d.eta), d.destination.label],
        },
        { title: 'Delivered to site', state: d.stage === 'delivered' ? 'done' : 'upcoming', details: d.deliveredAt ? [when(d.deliveredAt)] : [] },
      ]
    : []

  return (
    <AppScreen>
      <h1 className="font-display text-[26px] leading-tight font-bold">Live Delivery Tracking</h1>
      <p className="mb-3 text-[15px] text-muted">Track your machine in real time.</p>
      <HireMachineCard
        b={b}
        to={`/hires/${b.id}`}
        extra={
          d && (
            <div className="self-end text-right text-xs text-muted">
              <p>{d.stage === 'delivered' ? 'Delivered' : 'Est. arrival'}</p>
              <p className="text-sm font-semibold text-fg">{when(d.deliveredAt ?? d.eta)}</p>
            </div>
          )
        }
      />
      {initial.isPending && <Skeleton className="mt-3 h-64 rounded-[14px]" />}
      {!initial.isPending && !d && (
        <EmptyState className="mt-3" title="No delivery to track" description="Tracking appears once the supplier dispatches your machine." />
      )}
      {d && truck && (
        <>
          <div className="relative mt-3">
            <BaseMap center={truck} zoom={12} tiles="dark" label="Delivery route map" className="h-72 rounded-[14px] border border-line">
              <FitBounds points={d.route} padding={36} />
              <Polyline positions={d.route} pathOptions={{ color: '#006cff', weight: 5, opacity: 0.95 }} />
              <Marker position={d.route[0] ?? truck} icon={dotIcon('#f5a524')} title={d.origin.label} />
              <Marker position={d.route[d.route.length - 1] ?? truck} icon={dotIcon('#f5a524')} title={d.destination.label}>
                <Tooltip permanent direction="top" offset={[0, -12]} className="map-chip">
                  Site
                </Tooltip>
              </Marker>
              <Marker position={truck} icon={truckIcon} title="Delivery truck" zIndexOffset={1000} />
            </BaseMap>
            {d.stage !== 'delivered' && (
              <div className="absolute right-3 bottom-3 z-[500] rounded-lg border border-white/10 bg-app/85 px-3 py-1.5 text-right backdrop-blur" aria-live="polite">
                <p className="text-[11px] text-muted">ETA</p>
                <p className="text-sm font-semibold">{format(parseISO(d.eta), 'h:mm a')}</p>
              </div>
            )}
          </div>
          <Timeline steps={steps} className="mt-4" />
        </>
      )}
    </AppScreen>
  )
}
