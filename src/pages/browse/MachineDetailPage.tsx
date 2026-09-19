import { useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CircleCheck, Container, MoveDiagonal, Weight } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { SupplierRow } from '@/components/domain/MachineBits'
import {
  Button,
  EmptyState,
  ErrorState,
  Price,
  SectionLabel,
  SelectableCard,
  Skeleton,
  StatusPill,
} from '@/components/ui'
import { useMachine, useMe } from '@/data/hooks'
import type { HireType } from '@/data/types'
import { areaFor } from '@/auth/roles'

const SPEC_ICONS: Record<string, React.ReactNode> = {
  'Operating weight': <Weight strokeWidth={1.5} />,
  'Max reach': <MoveDiagonal strokeWidth={1.5} />,
  'Bucket capacity': <Container strokeWidth={1.5} />,
}

export function PhotoCarousel({
  photos,
  alt,
  overlay,
}: {
  photos: string[]
  alt: string
  overlay?: React.ReactNode
}) {
  const [index, setIndex] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const go = (i: number) => {
    const el = track.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }
  return (
    <div
      className="relative -mx-4"
      role="region"
      aria-roledescription="carousel"
      aria-label={`${alt} photos`}
    >
      <div
        ref={track}
        onScroll={(e) =>
          setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))
        }
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(Math.min(photos.length - 1, index + 1))
          if (e.key === 'ArrowLeft') go(Math.max(0, index - 1))
        }}
        tabIndex={0}
        className="flex aspect-[4/3] snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto focus-visible:outline-offset-[-4px]"
      >
        {photos.map((src, i) => (
          <img
            key={`${src}-${i}`}
            src={src}
            alt={i === 0 ? alt : `${alt}, photo ${i + 1}`}
            loading={i === 0 ? 'eager' : 'lazy'}
            className="size-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>
      {overlay}
      {photos.length > 1 && (
        <span
          className="absolute right-3 bottom-3 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium"
          aria-live="polite"
        >
          {index + 1}/{photos.length}
        </span>
      )}
    </div>
  )
}

/** Board 03 · Machine Detail */
export function MachineDetailPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const machine = useMachine(id)
  const { data: me } = useMe()
  const m = machine.data
  const [hire, setHire] = useState<HireType>((params.get('hire') as HireType | null) ?? 'dry')

  if (machine.isPending)
    return (
      <AppScreen>
        <Skeleton className="-mx-4 aspect-[4/3] rounded-none" />
        <Skeleton className="mt-4 h-7 w-2/3" />
        <Skeleton className="mt-2 h-4 w-1/3" />
        <Skeleton className="mt-4 h-16" />
      </AppScreen>
    )
  if (machine.isError)
    return (
      <AppScreen>
        <ErrorState onRetry={() => void machine.refetch()} />
      </AppScreen>
    )
  if (!m)
    return (
      <AppScreen>
        <EmptyState
          title="Machine not available"
          description="This listing may have been paused or removed."
        />
      </AppScreen>
    )

  const hireType = m.hireTypes.includes(hire) ? hire : (m.hireTypes[0] ?? 'dry')
  const specs = Object.entries(m.specs).slice(0, 3)
  const isContractor = !!me && areaFor(me) === 'contractor'
  const book = () => {
    const p = new URLSearchParams(params)
    p.set('hire', hireType)
    navigate(`/machines/${m.id}/book?${p.toString()}`)
  }

  return (
    <AppScreen
      hideNav
      footer={
        isContractor && m.status === 'live' ? (
          <Button arrow onClick={book} disabled={me?.role === 'viewer'}>
            {me?.role === 'viewer' ? 'Viewers can’t book' : 'Book Now'}
          </Button>
        ) : undefined
      }
      className="pt-0"
    >
      <PhotoCarousel photos={m.photos} alt={`${m.title}, ${m.make} ${m.model}`} />
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-[22px] font-bold">{m.title}</h1>
          <p className="text-sm text-muted">
            {m.make} {m.model}
          </p>
        </div>
        {m.status === 'live' ? (
          <StatusPill status="available" className="mt-1.5" />
        ) : (
          <StatusPill label="Not listed" tone="neutral" />
        )}
      </div>
      <SupplierRow machine={m} className="mt-3" />

      {specs.length > 0 && (
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          {specs.map(([k, v]) => (
            <div key={k} className="flex flex-col items-center gap-1 py-1">
              <span className="text-[#dae4ef] [&_svg]:size-6">
                {SPEC_ICONS[k] ?? <Weight strokeWidth={1.5} />}
              </span>
              <dd className="text-[13px] font-semibold">{v}</dd>
              <dt className="text-[11px] text-muted">{k}</dt>
            </div>
          ))}
        </dl>
      )}

      <div role="radiogroup" aria-label="Hire type" className="mt-3 grid grid-cols-2 gap-2">
        {(['dry', 'wet'] as const).map((t) => {
          const rate = t === 'dry' ? m.rates.daily : m.rates.wetDaily
          const offered = m.hireTypes.includes(t) && !!rate
          return (
            <SelectableCard
              key={t}
              selected={hireType === t}
              onSelect={() => setHire(t)}
              disabled={!offered}
              indicatorPosition="left"
              className="items-start"
              label={`${t === 'dry' ? 'Dry' : 'Wet'} hire${offered ? '' : ', not offered'}`}
              title={
                <span className="text-[13px] font-normal text-[#dae4ef]">
                  {t === 'dry' ? 'Dry Hire' : 'Wet Hire'}
                </span>
              }
            >
              {offered && rate ? (
                <Price cents={rate} className="block" />
              ) : (
                <span className="text-xs text-muted">Not offered</span>
              )}
            </SelectableCard>
          )
        })}
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {hireType === 'dry'
          ? 'Machine only. You supply a licensed operator.'
          : 'Includes a licensed operator.'}{' '}
        Prices exclude GST.
      </p>

      {m.features.length > 0 && (
        <>
          <SectionLabel>Key Features</SectionLabel>
          <ul className="space-y-2">
            {m.features.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm">
                <CircleCheck className="size-5 fill-success text-app" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </>
      )}
      {Object.keys(m.specs).length > 3 && (
        <>
          <SectionLabel>Specifications</SectionLabel>
          <dl className="divide-y divide-line rounded-[14px] border border-line bg-card px-3 text-sm">
            {Object.entries(m.specs).map(([k, v]) => (
              <div key={k} className="flex justify-between py-2">
                <dt className="text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </AppScreen>
  )
}
