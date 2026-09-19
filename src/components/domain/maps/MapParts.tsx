import { useEffect, type ReactNode } from 'react'
import L from 'leaflet'
import { AttributionControl, MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { cn } from '@/lib/cn'
import { TILES, type TileKind } from './mapUtils'

export function BaseMap({
  center,
  zoom,
  tiles,
  children,
  className,
  interactive = true,
  label,
}: {
  center: [number, number]
  zoom: number
  tiles: TileKind
  children?: ReactNode
  className?: string
  interactive?: boolean
  label: string
}) {
  return (
    <div
      role="region"
      aria-label={label}
      className={cn('relative isolate overflow-hidden', className)}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        keyboard={interactive}
        className="size-full bg-[#0b1a2a]"
      >
        <AttributionControl prefix={false} position="bottomleft" />
        <TileLayer {...TILES[tiles]} />
        {tiles === 'satellite' && <TileLayer {...TILES.labels} />}
        {tiles === 'dark' && <TileLayer {...TILES.darkLabels} />}
        {children}
      </MapContainer>
    </div>
  )
}

/** Keeps the map view in sync when the target moves. */
export function Recenter({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom ?? map.getZoom(), { animate: true })
  }, [map, center, zoom])
  return null
}

export function FitBounds({
  points,
  padding = 40,
}: {
  points: [number, number][]
  padding?: number
}) {
  const map = useMap()
  const key = JSON.stringify(points)
  useEffect(() => {
    const pts = JSON.parse(key) as [number, number][]
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [padding, padding] })
  }, [map, key, padding])
  return null
}
