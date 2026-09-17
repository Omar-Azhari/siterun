import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Checkbox, DateField, Input, SegmentedTabs, Select } from '@/components/ui'
import { selectedClass } from '@/components/ui/SelectableCard'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { useApiMutation } from '@/data/hooks'
import type { HireType } from '@/data/types'
import { isEditable, MIN_BOOKINGS, stepPath, useListing } from './listingShared'
import { ListingGate, WizardFrame } from './WizardFrame'

type Unit = 'hourly' | 'daily' | 'weekly'
const dollars = (c: number | null) => (c ? String(c / 100) : '')
const cents = (v: string) => (v.trim() ? Math.round(Number(v) * 100) : null)
const moneyOk = (v: string) => !v.trim() || (/^\d+(\.\d{1,2})?$/.test(v.trim()) && Number(v) > 0)

/** Board 07 · Step 5: rates & availability */
export function RatesStep() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const q = useListing(id)
  const m = q.data
  const [unit, setUnit] = useState<Unit>('hourly')
  const [rates, setRates] = useState<Record<string, string> | null>(null)
  const [hireTypes, setHireTypes] = useState<HireType[] | null>(null)
  const [minBooking, setMinBooking] = useState<string | null>(null)
  const [from, setFrom] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const save = useApiMutation((api, patch: Parameters<typeof api.saveMachineDraft>[1]) => api.saveMachineDraft(id, patch))

  if (!isEditable(m)) return <ListingGate query={q} machine={m} />
  const r = rates ?? { hourly: dollars(m.rates.hourly), daily: dollars(m.rates.daily), weekly: dollars(m.rates.weekly), wetDaily: dollars(m.rates.wetDaily) }
  const types = hireTypes ?? m.hireTypes
  const set = (k: string, v: string) => setRates({ ...r, [k]: v.replace(/[^\d.]/g, '') })

  const errors = submitted
    ? {
        hourly: !moneyOk(r.hourly ?? '') ? 'Enter a valid amount' : unit === 'hourly' && !r.hourly ? 'Required' : undefined,
        daily: !r.daily ? 'A daily rate is required' : !moneyOk(r.daily) ? 'Enter a valid amount' : undefined,
        weekly: !moneyOk(r.weekly ?? '') ? 'Enter a valid amount' : unit === 'weekly' && !r.weekly ? 'Required' : undefined,
        wetDaily: types.includes('wet') && (!r.wetDaily || !moneyOk(r.wetDaily)) ? 'Enter the wet hire daily rate' : undefined,
        types: types.length === 0 ? 'Choose at least one hire type' : undefined,
      }
    : {}

  const onContinue = () => {
    setSubmitted(true)
    const ok = r.daily && moneyOk(r.daily) && moneyOk(r.hourly ?? '') && moneyOk(r.weekly ?? '') && types.length > 0 && (!types.includes('wet') || (r.wetDaily && moneyOk(r.wetDaily))) && !(unit === 'hourly' && !r.hourly) && !(unit === 'weekly' && !r.weekly)
    if (!ok) return
    save.mutate(
      {
        rates: { hourly: cents(r.hourly ?? ''), daily: cents(r.daily ?? '') ?? 0, weekly: cents(r.weekly ?? ''), wetDaily: types.includes('wet') ? cents(r.wetDaily ?? '') : null },
        hireTypes: types,
        minBooking: minBooking ?? m.minBooking,
        availableFrom: from ?? m.availableFrom,
        draftStep: 5,
      },
      { onSuccess: () => navigate(stepPath(id, 'service-area')) },
    )
  }

  const toggleType = (t: HireType) => setHireTypes(types.includes(t) ? types.filter((x) => x !== t) : [...types, t])
  const rateInput = (key: 'hourly' | 'daily' | 'weekly', label: string) => (
    <Input
      label={`${label} rate (ex. GST)${key === unit || key === 'daily' ? ' *' : ''}`}
      inputMode="decimal"
      value={r[key] ?? ''}
      onChange={(e) => set(key, e.target.value)}
      leftIcon={<span className="text-fg">$</span>}
      error={errors[key]}
    />
  )

  return (
    <WizardFrame step="rates" title="Rates & Availability" subtitle="Set your hire rates and when the machine is available." onContinue={onContinue} saving={save.isPending}>
      <SegmentedTabs
        label="Main pricing unit"
        variant="joined"
        value={unit}
        onChange={setUnit}
        options={[
          { value: 'hourly', label: 'Hourly' },
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
        ]}
        className="mb-3"
      />
      {rateInput('hourly', 'Hourly')}
      {rateInput('daily', 'Daily')}
      {rateInput('weekly', 'Weekly')}

      <p className="mb-1.5 text-sm text-[#dae4ef]" id="hire-types">
        Hire type *
      </p>
      <div role="group" aria-labelledby="hire-types" className="grid grid-cols-2 gap-2">
        {(
          [
            ['dry', 'Dry Hire', 'Machine only'],
            ['wet', 'Wet Hire', 'With operator'],
          ] as const
        ).map(([t, title, sub]) => (
          <div key={t} className={cn(cardClass, 'rounded-[12px] px-3 py-1', types.includes(t) && selectedClass)}>
            <Checkbox checked={types.includes(t)} onChange={() => toggleType(t)} className="w-full">
              <span>
                <span className="block text-[15px] font-semibold text-fg">{title}</span>
                <span className="block text-xs text-muted">{sub}</span>
              </span>
            </Checkbox>
          </div>
        ))}
      </div>
      {errors.types && <p role="alert" className="mt-1 text-xs text-[#f87171]">{errors.types}</p>}
      {types.includes('wet') && (
        <Input className="mt-3" label="Wet hire daily rate (ex. GST) *" inputMode="decimal" value={r.wetDaily ?? ''} onChange={(e) => set('wetDaily', e.target.value)} leftIcon={<span className="text-fg">$</span>} hint="Includes a licensed operator." error={errors.wetDaily} />
      )}

      <Select className="mt-3" label="Minimum booking period *" value={minBooking ?? m.minBooking} onChange={(e) => setMinBooking(e.target.value)} options={MIN_BOOKINGS.map((v) => ({ value: v, label: v }))} />
      <p className="mb-1.5 text-[15px] font-semibold">Availability</p>
      <DateField label="Available from" value={from ?? m.availableFrom} min={format(new Date(), 'yyyy-MM-dd')} onChange={setFrom} />
    </WizardFrame>
  )
}
