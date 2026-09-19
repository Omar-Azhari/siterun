import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, IdCard, MapPin } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import {
  BottomSheet,
  Button,
  ListRow,
  ScreenTitle,
  SectionLabel,
  SelectableCard,
  StatusPill,
  Thumbnail,
} from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { selectedClass } from '@/components/ui/SelectableCard'
import { cn } from '@/lib/cn'
import { imgSm } from '@/lib/images'
import { useMyMachines } from '@/data/hooks'
import { STATES, useComplianceState } from './complianceUtils'

const TYPES = [
  { title: 'Excavators\n& General Plant', group: 'general', image: imgSm('excavator-komatsu') },
  { title: 'Cranes', group: 'crane', image: imgSm('crane-mobile') },
  { title: 'Telehandlers', group: 'general', image: imgSm('telehandler') },
  { title: 'Scissor Lifts', group: 'general', image: imgSm('scissor-lift') },
  { title: 'Generators', group: 'general', image: imgSm('generator-white') },
  { title: 'Other Plant', group: 'general', image: imgSm('loader') },
] as const

/** Board 08 · Compliance Checklist */
export function ComplianceChecklistPage() {
  const machines = useMyMachines()
  const [state, setState] = useComplianceState()
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState(0)

  return (
    <AppScreen root>
      <ScreenTitle
        title="Compliance Checklist"
        subtitle="Select a machine type to see required documents."
      />
      <ul className="space-y-2">
        {TYPES.map((t, i) => (
          <li key={t.title}>
            <Link
              to={`/supplier/compliance/requirements/${t.group}`}
              onClick={() => setPicked(i)}
              className={cn(
                cardClass,
                'flex items-center gap-3 overflow-hidden p-0 pr-3 hover:border-line-input',
                picked === i && selectedClass,
              )}
            >
              <Thumbnail src={t.image} alt="" className="h-16 w-[88px] rounded-none" />
              <span className="flex-1 text-base font-medium whitespace-pre-line">{t.title}</span>
              <ChevronRight className="size-5 text-[#dae4ef]" aria-hidden />
            </Link>
          </li>
        ))}
        <li>
          <ListRow
            to="/supplier/compliance/requirements/operator"
            leading={<IdCard className="size-8 text-primary" strokeWidth={1.4} />}
            title="Operator Documents"
            subtitle="HRWL, VOC, tickets and inductions"
          />
        </li>
      </ul>
      <div className={cn(cardClass, 'mt-3 flex items-center gap-3 p-3')}>
        <MapPin className="size-6 text-primary" aria-hidden />
        <span className="flex-1 text-sm">
          <span className="block text-muted">Your Location</span>
          {STATES.find((s) => s.value === state)?.label}
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 items-center gap-1 px-2 text-sm text-primary"
        >
          Change <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      <SectionLabel action={<Link to="/supplier/compliance/alerts">Expiry alerts ›</Link>}>
        Your machines
      </SectionLabel>
      <div className="space-y-2">
        {machines.data?.map((m) => (
          <ListRow
            key={m.id}
            to={`/supplier/machines/${m.id}/compliance`}
            leading={
              <Thumbnail
                src={m.photos[0]?.replace('.webp', '-sm.webp')}
                alt=""
                className="size-12"
              />
            }
            title={m.title}
            subtitle={`${m.make} ${m.model}${m.assetCode ? ` · ${m.assetCode}` : ''}`}
            trailing={<StatusPill status={m.status} />}
          />
        ))}
      </div>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Your location"
        footer={<Button onClick={() => setOpen(false)}>Done</Button>}
      >
        <p className="mb-3 text-sm text-muted">
          Requirements can vary by state. We’ll flag anything extra for your location.
        </p>
        <div role="radiogroup" aria-label="State" className="grid grid-cols-2 gap-2">
          {STATES.map((s) => (
            <SelectableCard
              key={s.value}
              selected={state === s.value}
              onSelect={() => setState(s.value)}
              title={s.short}
              description={s.name}
              className="py-2"
            />
          ))}
        </div>
      </BottomSheet>
    </AppScreen>
  )
}
