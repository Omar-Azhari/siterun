import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Circle, Marker, Tooltip } from 'react-leaflet'
import { ChevronRight, MapPin, Truck, Zap } from 'lucide-react'
import { AddressAutocomplete } from '@/components/domain/AddressAutocomplete'
import { BaseMap, Recenter } from '@/components/domain/maps/MapParts'
import { centreIcon } from '@/components/domain/maps/mapUtils'
import { BottomSheet, Button, SectionLabel, Slider, ToggleRow } from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { useApiMutation } from '@/data/hooks'
import { isEditable, useListing } from './listingShared'
import { ListingGate, WizardFrame } from './WizardFrame'

/** Rough zoom that fits a radius on a phone-width map. */
const zoomFor = (km: number) => (km <= 10 ? 11 : km <= 25 ? 10 : km <= 60 ? 9 : km <= 120 ? 8 : 7)

/** Board 07 · Step 6: service area & delivery. Finishing moves on to compliance documents. */
export function ServiceAreaStep() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const q = useListing(id)
  const m = q.data
  const [area, setArea] = useState<{
    lat: number
    lng: number
    suburb: string
    state: string
    radius: number
  } | null>(null)
  const [flags, setFlags] = useState<{
    offerDelivery: boolean
    sameDayDelivery: boolean
    thirdPartyTransport: boolean
  } | null>(null)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const save = useApiMutation(
    (api, patch: Parameters<typeof api.saveMachineDraft>[1]) => api.saveMachineDraft(id, patch),
    { success: 'Listing saved' },
  )

  if (!isEditable(m)) return <ListingGate query={q} machine={m} />
  const a = area ?? {
    lat: m.lat,
    lng: m.lng,
    suburb: m.suburb,
    state: m.state,
    radius: m.serviceRadiusKm,
  }
  const f = flags ?? {
    offerDelivery: m.offerDelivery,
    sameDayDelivery: m.sameDayDelivery,
    thirdPartyTransport: m.thirdPartyTransport,
  }
  const centre: [number, number] = [a.lat, a.lng]

  const finish = () =>
    save.mutate(
      {
        lat: a.lat,
        lng: a.lng,
        suburb: a.suburb,
        state: a.state,
        serviceRadiusKm: a.radius,
        ...f,
        sameDayDelivery: f.offerDelivery && f.sameDayDelivery,
        draftStep: 6,
      },
      { onSuccess: () => navigate(`/supplier/machines/${id}/compliance`) },
    )

  return (
    <WizardFrame
      step="service-area"
      title="Service Area & Delivery"
      subtitle="Set where your machine can be hired and delivery options."
      continueLabel="Create Listing"
      onContinue={finish}
      saving={save.isPending}
    >
      <SectionLabel className="mt-0">Service area</SectionLabel>
      <div className={cn(cardClass, 'overflow-hidden')}>
        <div className="relative">
          <BaseMap
            center={centre}
            zoom={zoomFor(a.radius)}
            tiles="satellite"
            interactive={false}
            label={`Service area: ${a.radius} km around ${a.suburb}`}
            className="h-44"
          >
            <Recenter center={centre} zoom={zoomFor(a.radius)} />
            <Circle
              center={centre}
              radius={a.radius * 1000}
              pathOptions={{ color: '#3b82f6', weight: 2, fillColor: '#006cff', fillOpacity: 0.2 }}
            />
            <Marker position={centre} icon={centreIcon}>
              <Tooltip permanent direction="bottom" offset={[0, 10]} className="map-chip">
                {a.suburb}
              </Tooltip>
            </Marker>
          </BaseMap>
          <span className="absolute top-2 right-2 z-[500] rounded-lg bg-app/85 px-2.5 py-1 text-xs font-semibold backdrop-blur">
            {a.radius} km radius
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-12 w-full items-center gap-3 px-3 text-left hover:bg-white/5"
        >
          <MapPin className="size-5 text-[#dae4ef]" aria-hidden />
          <span className="flex-1 text-[15px]">Set service area</span>
          <ChevronRight className="size-5 text-muted" aria-hidden />
        </button>
      </div>

      <SectionLabel>Delivery options</SectionLabel>
      <div className="space-y-2">
        <ToggleRow
          icon={<Truck strokeWidth={1.5} />}
          title="Offer delivery"
          description="Deliver to customer site"
          checked={f.offerDelivery}
          onChange={(v) =>
            setFlags({ ...f, offerDelivery: v, sameDayDelivery: v && f.sameDayDelivery })
          }
        />
        <ToggleRow
          icon={<Zap strokeWidth={1.5} />}
          title="Same-day delivery"
          description="Available when possible"
          checked={f.sameDayDelivery}
          disabled={!f.offerDelivery}
          onChange={(v) => setFlags({ ...f, sameDayDelivery: v })}
        />
        <ToggleRow
          icon={<Truck strokeWidth={1.5} className="text-white" />}
          title="Third-party transport"
          description="Customer arranges own"
          checked={f.thirdPartyTransport}
          onChange={(v) => setFlags({ ...f, thirdPartyTransport: v })}
        />
      </div>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Service area"
        footer={<Button onClick={() => setOpen(false)}>Done</Button>}
      >
        <AddressAutocomplete
          label="Yard or base location"
          value={text}
          onChange={setText}
          placeholder={`${a.suburb}, ${a.state}`}
          onSelect={(p) => {
            setText(p.label)
            setArea({ ...a, lat: p.lat, lng: p.lng, suburb: p.suburb, state: p.state })
          }}
        />
        <Slider
          label="Radius"
          min={5}
          max={250}
          step={5}
          value={a.radius}
          onChange={(v) => setArea({ ...a, radius: v })}
          format={(v) => `${v} km`}
        />
        <p className="text-xs text-muted">
          Your machine only appears in searches within this distance of the base location.
        </p>
      </BottomSheet>
    </WizardFrame>
  )
}
