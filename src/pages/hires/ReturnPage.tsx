import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addDays, format, parseISO } from 'date-fns'
import { AppScreen } from '@/components/layout/AppScreen'
import { Button, DateField, InfoNote, ScreenTitle, SectionLabel, SelectableCard, Textarea } from '@/components/ui'
import { formatDateLong } from '@/lib/format'
import { useApiMutation } from '@/data/hooks'
import type { CollectionRequest } from '@/data/types'
import { HireGate } from './HireGate'
import { HireMachineCard } from './HireMachineCard'
import { useHire } from './hireShared'

const SLOTS = [
  { value: 'morning', title: 'Morning', time: '7:00 AM – 12:00 PM' },
  { value: 'afternoon', title: 'Afternoon', time: '12:00 PM – 5:00 PM' },
] as const

/** Board 04 · Off-hire / Schedule Return */
export function ReturnPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { q, b, state } = useHire(id)
  const [date, setDate] = useState<string | null>(null)
  const [slot, setSlot] = useState<CollectionRequest['slot'] | null>(null)
  const [notes, setNotes] = useState<string | null>(null)
  const schedule = useApiMutation((api, req: CollectionRequest) => api.scheduleReturn(id ?? '', req), {
    success: (r) => `Collection booked for ${format(parseISO(r.collection?.date ?? r.endDate), 'EEE d MMM')}`,
  })
  if (!b) return <HireGate state={state} retry={() => void q.refetch()} />

  const today = format(new Date(), 'yyyy-MM-dd')
  const value = {
    date: date ?? b.collection?.date ?? (b.endDate < today ? today : b.endDate),
    slot: slot ?? b.collection?.slot ?? 'morning',
    notes: notes ?? b.collection?.notes ?? b.site?.accessNotes ?? '',
  }
  const canReturn = b.status === 'on_site' || b.status === 'return_scheduled'

  return (
    <AppScreen
      hideNav
      footer={
        <Button arrow disabled={!canReturn} loading={schedule.isPending} onClick={() => schedule.mutate(value, { onSuccess: () => navigate(`/hires/${b.id}`) })}>
          Schedule Return
        </Button>
      }
    >
      <ScreenTitle title="Off-hire / Schedule Return" subtitle="Tell us when you’re ready for collection." />
      <HireMachineCard b={b} />
      {!canReturn && <p className="mt-2 text-sm text-[#f7b84b]">Returns can be booked once the machine is on site.</p>}
      <SectionLabel>Preferred Collection Date</SectionLabel>
      <DateField
        label="Preferred collection date"
        hideLabel
        value={value.date}
        min={today}
        max={format(addDays(parseISO(b.endDate), 14), 'yyyy-MM-dd')}
        onChange={setDate}
        hint={value.date < b.endDate ? `Early return. Hire ends ${formatDateLong(b.endDate)}.` : undefined}
      />
      <SectionLabel className="mt-1">Preferred Collection Time</SectionLabel>
      <div role="radiogroup" aria-label="Collection time" className="space-y-2">
        {SLOTS.map((s) => (
          <SelectableCard key={s.value} selected={value.slot === s.value} onSelect={() => setSlot(s.value)} indicatorPosition="left" title={s.title} description={s.time} />
        ))}
      </div>
      <Textarea label="Site Access Notes (Optional)" className="mt-4" rows={3} maxLength={250} value={value.notes} onChange={(e) => setNotes(e.target.value)} />
      <InfoNote>Our supplier will confirm your collection time via SMS.</InfoNote>
    </AppScreen>
  )
}
