import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Marker, Tooltip, useMapEvents } from 'react-leaflet'
import type L from 'leaflet'
import { Layers, LocateFixed, Search } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { AddressAutocomplete } from '@/components/domain/AddressAutocomplete'
import { BaseMap, Recenter } from '@/components/domain/maps/MapParts'
import { pinIcon, type TileKind } from '@/components/domain/maps/mapUtils'
import { Button, ScreenTitle, useToast } from '@/components/ui'
import { reverseGeocode } from '@/lib/geo'
import { useSiteDraft } from './siteDraft'

function ClickToMove({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMove(e.latlng.lat, e.latlng.lng) })
  return null
}

/** Board 02 · Create Your First Site (location picker) */
export function CreateSiteLocationPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { draft, update } = useSiteDraft(params.get('demo') === '1')
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState<[number, number]>([draft.lat ?? -37.6833, draft.lng ?? 144.9583])
  const [label, setLabel] = useState(
    draft.address
      ? `${draft.address}\n${draft.suburb} ${draft.state} ${draft.postcode}`.trim()
      : '123 Construction Rd\nCampbellfield, VIC',
  )
  const [place, setPlace] = useState({
    address: draft.address ?? '123 Construction Rd',
    suburb: draft.suburb ?? 'Campbellfield',
    state: draft.state ?? 'VIC',
    postcode: draft.postcode ?? '3061',
  })
  const [tiles, setTiles] = useState<TileKind>('satellite')
  const [recentre, setRecentre] = useState<[number, number]>(pos)
  const marker = useRef<L.Marker>(null)
  const lookup = useRef<AbortController | null>(null)

  const moveTo = async (lat: number, lng: number) => {
    setPos([lat, lng])
    lookup.current?.abort()
    const ctrl = new AbortController()
    lookup.current = ctrl
    try {
      const p = await reverseGeocode(lat, lng, ctrl.signal)
      if (p) {
        const addr = p.line1 || p.suburb
        setPlace({ address: addr, suburb: p.suburb, state: p.state, postcode: p.postcode })
        setLabel(`${addr}\n${p.suburb}, ${p.state}`)
      }
    } catch {
      // aborted
    }
  }

  useEffect(() => () => lookup.current?.abort(), [])

  const handlers = useMemo(
    () => ({
      dragend() {
        const m = marker.current
        if (m) void moveTo(m.getLatLng().lat, m.getLatLng().lng)
      },
    }),
    [],
  )

  const locate = () => {
    if (!navigator.geolocation) {
      toast.error('Location unavailable', 'Your browser doesn’t support location.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next: [number, number] = [p.coords.latitude, p.coords.longitude]
        setRecentre(next)
        void moveTo(...next)
      },
      () => toast.error('Location unavailable', 'Allow location access or search for an address.'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  const confirm = () => {
    update({ lat: pos[0], lng: pos[1], ...place })
    navigate(`/sites/new/details${params.get('demo') ? '?demo=1' : ''}`)
  }

  return (
    <AppScreen
      hideNav
      footer={
        <Button arrow onClick={confirm}>
          Confirm Location
        </Button>
      }
    >
      <ScreenTitle
        title="Create Your First Site"
        subtitle="Find your project location and drop a pin on the map."
      />
      <AddressAutocomplete
        label="Search address or suburb"
        hideLabel
        placeholder="Search address or suburb"
        value={query}
        onChange={setQuery}
        leftIcon={<Search strokeWidth={1.75} />}
        near={{ lat: pos[0], lng: pos[1] }}
        onSelect={(p) => {
          setQuery(p.label)
          setPos([p.lat, p.lng])
          setRecentre([p.lat, p.lng])
          const addr = p.line1 || p.suburb
          setPlace({ address: addr, suburb: p.suburb, state: p.state, postcode: p.postcode })
          setLabel(`${addr}\n${p.suburb}, ${p.state}`)
        }}
      />
      <div className="relative -mx-4 mt-1">
        <BaseMap
          center={pos}
          zoom={16}
          tiles={tiles}
          label="Site location map"
          className="h-[min(58dvh,460px)]"
        >
          <Recenter center={recentre} zoom={16} />
          <ClickToMove onMove={(lat, lng) => void moveTo(lat, lng)} />
          <Marker
            position={pos}
            icon={pinIcon}
            draggable
            eventHandlers={handlers}
            ref={marker}
            keyboard
            title="Site pin (drag to adjust)"
          >
            <Tooltip permanent direction="top" offset={[0, -50]} className="site-pin-label">
              {label.split('\n').map((l) => (
                <div key={l}>{l}</div>
              ))}
            </Tooltip>
          </Marker>
        </BaseMap>
        <div className="absolute top-3 right-3 z-[500] flex flex-col overflow-hidden rounded-xl border border-white/10 bg-app/85 backdrop-blur">
          <button
            type="button"
            onClick={locate}
            aria-label="Use my location"
            className="flex size-11 items-center justify-center hover:bg-white/10"
          >
            <LocateFixed className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setTiles((t) => (t === 'satellite' ? 'streets' : 'satellite'))}
            aria-label={tiles === 'satellite' ? 'Show street map' : 'Show satellite map'}
            className="flex size-11 items-center justify-center border-t border-white/10 hover:bg-white/10"
          >
            <Layers className="size-5" />
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">
        Drag the pin or tap the map to fine-tune the site entrance.
      </p>
    </AppScreen>
  )
}
