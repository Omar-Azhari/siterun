import { useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { addDays, format } from 'date-fns'
import { ChevronRight, Info, MapPin } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { MachineSummary } from '@/components/domain/MachineBits'
import {
  BottomSheet,
  Button,
  DateField,
  EmptyState,
  ListSkeleton,
  ScreenTitle,
  Select,
  SelectableCard,
  Textarea,
  Toggle,
} from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { bookingTotal, hireDays } from '@/lib/booking'
import { useApiMutation, useMachine, useMe, useSites } from '@/data/hooks'
import type { DeliveryMethod, HireType } from '@/data/types'

/** Board 03 · Book Equipment */
export function BookPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data: me } = useMe()
  const machine = useMachine(id)
  const sites = useSites()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [start, setStart] = useState(params.get('start') ?? format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [end, setEnd] = useState(params.get('end') ?? format(addDays(new Date(), 5), 'yyyy-MM-dd'))
  const [quantity, setQuantity] = useState('1')
  const [delivery, setDelivery] = useState<DeliveryMethod>('pickup')
  const [insurance, setInsurance] = useState(true)
  const [siteId, setSiteId] = useState<string | null>(params.get('site'))
  const [message, setMessage] = useState('')
  const [showInsurance, setShowInsurance] = useState(false)
  const [picker, setPicker] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const create = useApiMutation((api, v: Parameters<typeof api.createBooking>[0]) => api.createBooking(v))

  const m = machine.data
  const hireType = (params.get('hire') as HireType | null) ?? 'dry'
  if (me?.role === 'viewer') return <Navigate to={`/machines/${id}`} replace />
  if (machine.isPending) return <AppScreen hideNav><ListSkeleton rows={4} /></AppScreen>
  if (!m) return <AppScreen hideNav><EmptyState title="Machine not available" /></AppScreen>

  const site = sites.data?.find((s) => s.id === siteId) ?? (siteId === null ? sites.data?.find((s) => s.status === 'active') : undefined)
  const rate = hireType === 'wet' ? (m.rates.wetDaily ?? m.rates.daily) : m.rates.daily
  const days = hireDays(start, end)
  const total = bookingTotal(start, end, rate, Number(quantity))
  const errors = {
    start: submitted && !start ? 'Choose a start date' : submitted && start < today ? 'Start date can’t be in the past' : undefined,
    end: submitted && (!end || end < start) ? 'End date must be on or after the start date' : undefined,
    site: submitted && !site ? 'Choose a site' : undefined,
  }

  const submit = () => {
    setSubmitted(true)
    if (!start || !end || start < today || end < start || !site) return
    create.mutate(
      { machineId: m.id, startDate: start, endDate: end, quantity: Number(quantity), hireType, delivery, insurance, siteId: site.id, message },
      { onSuccess: (b) => navigate(`/bookings/${b.id}/confirmed`, { replace: true }) },
    )
  }

  return (
    <AppScreen hideNav footer={<Button arrow onClick={submit} loading={create.isPending}>Continue</Button>}>
      <ScreenTitle title="Book Equipment" subtitle="Confirm your booking details." />
      <MachineSummary machine={{ ...m, rates: { ...m.rates, daily: rate } }} to={`/machines/${m.id}`} />
      <div className="mt-3">
        <DateField label="Start date" value={start} min={today} onChange={setStart} error={errors.start} />
        <DateField label="End date" value={end} min={start || today} onChange={setEnd} error={errors.end} />
        <Select
          label="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} machine${n > 1 ? 's' : ''}` }))}
        />
      </div>
      <p className="mb-1.5 text-sm text-[#dae4ef]" id="delivery-label">
        Delivery option
      </p>
      <div role="radiogroup" aria-labelledby="delivery-label" className="grid grid-cols-2 gap-2">
        <SelectableCard
          selected={delivery === 'pickup'}
          onSelect={() => setDelivery('pickup')}
          indicator="radio"
          indicatorPosition="top-left"
          className="items-start pt-10"
          title={<span className="text-[13px]">Customer Pickup</span>}
          description={<span className="text-xs">From supplier yard</span>}
        />
        <SelectableCard
          selected={delivery === 'delivery'}
          onSelect={() => setDelivery('delivery')}
          disabled={!m.offerDelivery}
          indicator="radio"
          indicatorPosition="top-left"
          className="items-start pt-10"
          title={<span className="text-[13px]">Site Delivery</span>}
          description={<span className="text-xs">{m.offerDelivery ? 'Deliver to your site' : 'Not offered'}</span>}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1">
          <p className="flex items-center gap-1.5 text-sm font-medium" id="ins-label">
            Add insurance
            <button type="button" aria-label="About insurance" aria-expanded={showInsurance} onClick={() => setShowInsurance((s) => !s)} className="-m-2 p-2 text-[#dae4ef]">
              <Info className="size-4" />
            </button>
          </p>
          <p className="text-xs text-muted">Covers accidental damage</p>
        </div>
        <Toggle label="Add insurance" labelledBy="ins-label" checked={insurance} onChange={setInsurance} />
      </div>
      {showInsurance && <p className="mt-1 text-xs text-muted">Damage waiver up to the machine’s value, excess $1,000. Theft and third-party liability are covered by the supplier’s policy.</p>}

      <p className="mt-4 mb-1.5 text-sm text-[#dae4ef]">Site</p>
      <button
        type="button"
        onClick={() => setPicker(true)}
        aria-label={`Site: ${site ? site.name : 'choose a site'}`}
        className={cn(cardClass, 'flex w-full items-center gap-3 rounded-[10px] p-3 text-left hover:border-line-input', errors.site && 'border-danger')}
      >
        <MapPin className="size-5 text-[#dae4ef]" aria-hidden />
        <span className="flex-1">
          <span className="block text-sm font-medium">{site?.name ?? 'Choose a site'}</span>
          {site && <span className="block text-xs text-muted">{site.suburb}, {site.state}</span>}
        </span>
        <ChevronRight className="size-5 text-muted" aria-hidden />
      </button>
      {errors.site && <p role="alert" className="mt-1 text-xs text-[#f87171]">{errors.site}</p>}

      <Textarea label="Message to supplier (optional)" className="mt-4" rows={2} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Access details, operator needs…" />

      {days > 0 && (
        <p className="rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-muted" aria-live="polite">
          {days} day{days === 1 ? '' : 's'} × {formatMoney(rate)}/day{Number(quantity) > 1 ? ` × ${quantity}` : ''} ={' '}
          <span className="font-semibold text-fg">{formatMoney(total)}</span> (ex. GST)
        </p>
      )}

      <BottomSheet open={picker} onClose={() => setPicker(false)} title="Choose a site">
        <div role="radiogroup" aria-label="Site" className="space-y-2">
          {sites.data?.map((s) => (
            <SelectableCard
              key={s.id}
              selected={site?.id === s.id}
              onSelect={() => {
                setSiteId(s.id)
                setPicker(false)
              }}
              icon={<MapPin className="size-5" />}
              title={s.name}
              description={`${s.suburb}, ${s.state}`}
            />
          ))}
          {sites.data?.length === 0 && <p className="text-sm text-muted">You don’t have any sites yet.</p>}
          <Button variant="ghost" onClick={() => navigate('/sites/new/location')}>
            + Add a new site
          </Button>
        </div>
      </BottomSheet>
    </AppScreen>
  )
}
