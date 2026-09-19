import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { CalendarDays, ChevronRight, Plus } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import {
  BottomSheet,
  Button,
  Card,
  DateField,
  Price,
  ScreenTitle,
  SectionLabel,
  SelectableCard,
} from '@/components/ui'
import { extensionCost, extensionRate, extensionTiers } from '@/lib/booking'
import { formatDateLong, formatMoney } from '@/lib/format'
import { useApiMutation } from '@/data/hooks'
import { HireGate } from './HireGate'
import { HireMachineCard } from './HireMachineCard'
import { useHire } from './hireShared'
import { cn } from '@/lib/cn'

function PlusMark({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-[26px] shrink-0 items-center justify-center rounded-full border-[1.5px]',
        on ? 'border-primary bg-primary' : 'border-muted',
      )}
    >
      {on && <Plus className="size-4 text-white" strokeWidth={3} />}
    </span>
  )
}

/** Board 04 · Extend Hire */
export function ExtendHirePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { q, b, state } = useHire(id)
  const [choice, setChoice] = useState<number | 'custom'>(3)
  const [custom, setCustom] = useState('')
  const [sheet, setSheet] = useState(false)
  const extend = useApiMutation((api, end: string) => api.extendHire(id ?? '', end), {
    success: (r) => `Hire extended to ${format(parseISO(r.endDate), 'EEE d MMM')}`,
  })
  const tiers = useMemo(() => (b ? extensionTiers(b.dailyRate, b.endDate) : []), [b])
  if (!b) return <HireGate state={state} retry={() => void q.refetch()} />

  const newEnd = choice === 'custom' ? custom : (tiers.find((t) => t.days === choice)?.newEnd ?? '')
  const days = newEnd ? differenceInCalendarDays(parseISO(newEnd), parseISO(b.endDate)) : 0
  const rate = extensionRate(b.dailyRate, days)
  const cost = days > 0 ? extensionCost(b.dailyRate, days) * b.quantity : 0
  const minCustom = format(addDays(parseISO(b.endDate), 1), 'yyyy-MM-dd')

  return (
    <AppScreen
      hideNav
      footer={
        <Button
          arrow
          disabled={days <= 0}
          loading={extend.isPending}
          onClick={() => extend.mutate(newEnd, { onSuccess: () => navigate(`/hires/${b.id}`) })}
        >
          Confirm Extension
        </Button>
      }
    >
      <ScreenTitle title="Extend Hire" subtitle="Need more time? Extend your hire instantly." />
      <HireMachineCard b={b} />
      <SectionLabel>Current Hire Period</SectionLabel>
      <Card className="flex items-center gap-3 py-3 text-sm">
        <CalendarDays className="size-6 text-[#dae4ef]" strokeWidth={1.5} aria-hidden />
        <span>
          {format(parseISO(b.startDate), 'EEE, d MMM')} – {formatDateLong(b.endDate)}
          <span className="block text-muted">({b.days} days)</span>
        </span>
      </Card>
      <SectionLabel>Select New End Date</SectionLabel>
      <div role="radiogroup" aria-label="Extension length" className="space-y-2">
        {tiers.map((t) => (
          <SelectableCard
            key={t.days}
            selected={choice === t.days}
            onSelect={() => setChoice(t.days)}
            indicator="none"
            icon={<PlusMark on={choice === t.days} />}
            title={`+ ${t.days} days`}
            description={formatDateLong(t.newEnd)}
            aside={<Price cents={t.rate} />}
            className="py-2.5"
          />
        ))}
        <SelectableCard
          selected={choice === 'custom'}
          onSelect={() => {
            setChoice('custom')
            setSheet(true)
          }}
          indicator="none"
          icon={<PlusMark on={choice === 'custom'} />}
          title="Custom dates"
          description={custom ? formatDateLong(custom) : 'Choose your own end date'}
          aside={<ChevronRight className="size-5 text-muted" aria-hidden />}
          className="py-2.5"
        />
      </div>
      <Card className="mt-4">
        <p className="text-sm text-muted">Estimated additional cost</p>
        <p className="mt-1" aria-live="polite">
          <span className="font-display text-[32px] font-bold">{formatMoney(cost)}</span>{' '}
          <span className="text-sm text-muted">(ex. GST)</span>
        </p>
        <p className="text-sm text-muted">
          {days > 0
            ? `${days} days × ${formatMoney(rate)}/day${b.quantity > 1 ? ` × ${b.quantity}` : ''}`
            : 'Choose a new end date'}
        </p>
      </Card>

      <BottomSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="Custom end date"
        footer={
          <Button disabled={!custom} onClick={() => setSheet(false)}>
            Use this date
          </Button>
        }
      >
        <DateField
          label="New end date"
          value={custom}
          min={minCustom}
          onChange={setCustom}
          hint={`Current hire ends ${formatDateLong(b.endDate)}`}
        />
      </BottomSheet>
    </AppScreen>
  )
}
