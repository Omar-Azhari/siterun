import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { addDays, format } from 'date-fns'
import { ChevronRight, CircleDollarSign, MapPin, Weight } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { AddressAutocomplete } from '@/components/domain/AddressAutocomplete'
import { filtersFromParams, paramsFromFilters } from '@/components/domain/searchParams'
import {
  BottomSheet,
  Button,
  DateField,
  ScreenTitle,
  SearchInput,
  SelectableCard,
  Slider,
} from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { useCategories, useSites } from '@/data/hooks'
import type { SearchFilters } from '@/data/types'

function RowButton({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: string; onClick: () => void }) {
  return (
    <div className="mb-3.5">
      <p className="mb-1.5 text-sm text-[#dae4ef]" id={`lbl-${label}`}>
        {label}
      </p>
      <button
        type="button"
        onClick={onClick}
        aria-labelledby={`lbl-${label}`}
        aria-describedby={`val-${label}`}
        className={cn(cardClass, 'flex h-[50px] w-full items-center gap-2.5 rounded-[10px] border-line-input bg-input bg-none px-3.5 text-left hover:border-primary')}
      >
        <span className="text-[#dae4ef] [&_svg]:size-5">{icon}</span>
        <span id={`val-${label}`} className="flex-1 truncate text-base">
          {value}
        </span>
        <ChevronRight className="size-5 text-[#dae4ef]" aria-hidden />
      </button>
    </div>
  )
}

/** Board 03 · Search & Filters */
export function SearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const sites = useSites()
  const categories = useCategories()
  const initial = useMemo(
    () => Object.fromEntries(Object.entries(filtersFromParams(params)).filter(([, v]) => v !== undefined)) as SearchFilters,
    [params],
  )
  const [f, setF] = useState<SearchFilters>({
    location: 'Melbourne, VIC',
    startDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 5), 'yyyy-MM-dd'),
    minTonnes: 3,
    maxTonnes: 10,
    minPrice: 0,
    maxPrice: 1000,
    hireType: 'dry',
    ...initial,
  })
  const [sheet, setSheet] = useState<'location' | 'capacity' | 'price' | null>(null)
  const [locText, setLocText] = useState('')
  const set = (patch: SearchFilters) => setF((x) => ({ ...x, ...patch }))
  const today = format(new Date(), 'yyyy-MM-dd')
  const dateError = f.startDate && f.endDate && f.endDate < f.startDate ? 'End date must be after the start date' : undefined

  const submit = () => {
    if (dateError) return
    const p = paramsFromFilters({ ...f, page: undefined })
    const site = params.get('site')
    if (site) p.set('site', site)
    navigate(`/search/results?${p.toString()}`)
  }

  return (
    <AppScreen footer={<Button arrow onClick={submit}>Search Equipment</Button>}>
      <ScreenTitle title="Search & Filters" subtitle="Find the right equipment for your job." />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <SearchInput
          label="Keyword"
          placeholder="Excavator, telehandler, generator…"
          value={f.q ?? ''}
          onChange={(e) => set({ q: e.target.value })}
          onClear={() => set({ q: '' })}
        />
        {f.categorySlug && (
          <p className="-mt-2 mb-3 text-xs text-muted">
            Category: {categories.data?.find((c) => c.slug === f.categorySlug)?.name}{' '}
            <button type="button" className="text-primary" onClick={() => set({ categorySlug: undefined })}>
              Clear
            </button>
          </p>
        )}
        <RowButton icon={<MapPin strokeWidth={1.75} />} label="Location" value={f.location || 'Anywhere'} onClick={() => setSheet('location')} />
        <DateField label="Start date" value={f.startDate ?? ''} min={today} onChange={(v) => set({ startDate: v })} />
        <DateField label="End date" value={f.endDate ?? ''} min={f.startDate || today} onChange={(v) => set({ endDate: v })} error={dateError} />
        <RowButton
          icon={<Weight strokeWidth={1.75} />}
          label="Capacity / Size"
          value={f.minTonnes === undefined && f.maxTonnes === undefined ? 'Any size' : `${f.minTonnes ?? 0} – ${f.maxTonnes ?? 50} tonnes`}
          onClick={() => setSheet('capacity')}
        />
        <RowButton
          icon={<CircleDollarSign strokeWidth={1.75} />}
          label="Price range (per day)"
          value={f.minPrice === undefined && f.maxPrice === undefined ? 'Any price' : `$${f.minPrice ?? 0} – $${(f.maxPrice ?? 3000).toLocaleString('en-AU')}`}
          onClick={() => setSheet('price')}
        />
        <p className="mb-1.5 text-sm text-[#dae4ef]" id="hire-type">
          Hire type
        </p>
        <div role="radiogroup" aria-labelledby="hire-type" className="grid grid-cols-2 gap-2">
          <SelectableCard selected={f.hireType === 'dry'} onSelect={() => set({ hireType: 'dry' })} indicatorPosition="left" title="Dry Hire" className="py-3" />
          <SelectableCard selected={f.hireType === 'wet'} onSelect={() => set({ hireType: 'wet' })} indicatorPosition="left" title="Wet Hire" className="py-3" />
        </div>
        <button type="submit" hidden />
      </form>

      <BottomSheet open={sheet === 'location'} onClose={() => setSheet(null)} title="Location">
        <AddressAutocomplete
          label="Suburb or address"
          value={locText}
          onChange={setLocText}
          onSelect={(p) => {
            set({ location: `${p.suburb}, ${p.state}`, lat: p.lat, lng: p.lng })
            setSheet(null)
          }}
          placeholder="Search suburb"
        />
        {!!sites.data?.length && (
          <>
            <p className="mb-2 text-sm font-semibold">Your sites</p>
            <div className="space-y-2">
              {sites.data.map((s) => (
                <SelectableCard
                  key={s.id}
                  selected={f.lat === s.lat && f.lng === s.lng}
                  onSelect={() => {
                    set({ location: `${s.suburb}, ${s.state}`, lat: s.lat, lng: s.lng })
                    setSheet(null)
                  }}
                  icon={<MapPin className="size-5" />}
                  title={s.name}
                  description={`${s.suburb}, ${s.state}`}
                />
              ))}
            </div>
          </>
        )}
      </BottomSheet>

      <BottomSheet open={sheet === 'capacity'} onClose={() => setSheet(null)} title="Capacity / Size" footer={<Button onClick={() => setSheet(null)}>Apply</Button>}>
        <Slider label="Minimum" min={0} max={50} step={0.5} value={f.minTonnes ?? 0} onChange={(v) => set({ minTonnes: Math.min(v, f.maxTonnes ?? 50) })} format={(v) => `${v} t`} />
        <Slider label="Maximum" min={0} max={50} step={0.5} value={f.maxTonnes ?? 50} onChange={(v) => set({ maxTonnes: Math.max(v, f.minTonnes ?? 0) })} format={(v) => `${v} t`} />
        <Button variant="ghost" size="sm" onClick={() => set({ minTonnes: undefined, maxTonnes: undefined })}>
          Any size
        </Button>
      </BottomSheet>

      <BottomSheet open={sheet === 'price'} onClose={() => setSheet(null)} title="Price range (per day)" footer={<Button onClick={() => setSheet(null)}>Apply</Button>}>
        <Slider label="Minimum" min={0} max={3000} step={10} value={f.minPrice ?? 0} onChange={(v) => set({ minPrice: Math.min(v, f.maxPrice ?? 3000) })} format={(v) => `$${v.toLocaleString('en-AU')}`} />
        <Slider label="Maximum" min={0} max={3000} step={10} value={f.maxPrice ?? 3000} onChange={(v) => set({ maxPrice: Math.max(v, f.minPrice ?? 0) })} format={(v) => `$${v.toLocaleString('en-AU')}`} />
        <Button variant="ghost" size="sm" onClick={() => set({ minPrice: undefined, maxPrice: undefined })}>
          Any price
        </Button>
      </BottomSheet>
    </AppScreen>
  )
}
