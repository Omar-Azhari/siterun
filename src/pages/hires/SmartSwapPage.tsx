import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Info, Repeat2 } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { Button, Card, InfoNote, ScreenTitle, SelectableCard, Thumbnail } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { SWAP_OPTIONS, type SwapOptionId } from '@/lib/booking'
import { useApiMutation, useCategories, useSearch } from '@/data/hooks'
import type { Machine } from '@/data/types'
import { HireGate } from './HireGate'
import { useHire } from './hireShared'

const sizeLabel = (m: Machine | undefined, fallback: string) =>
  m?.capacityTonnes
    ? `${m.capacityTonnes}t ${m.title.replace(/^[\d.]+t\s*/, '').toLowerCase()}`
    : fallback

/** Board 04 · Smart Swap */
export function SmartSwapPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { q, b, state } = useHire(id)
  const categories = useCategories()
  const slug = categories.data?.find((c) => c.id === b?.machine.categoryId)?.slug
  const similar = useSearch({ categorySlug: slug, pageSize: 50 })
  const [choice, setChoice] = useState<SwapOptionId>('same')
  const swap = useApiMutation((api, opt: SwapOptionId) => api.smartSwap(id ?? '', opt), {
    success: 'Smart Swap requested',
  })
  if (!b) return <HireGate state={state} retry={() => void q.refetch()} />

  const cap = b.machine.capacityTonnes ?? 0
  const others = (similar.data?.items ?? []).filter((m) => m.id !== b.machine.id)
  const bigger = others
    .filter((m) => (m.capacityTonnes ?? 0) > cap)
    .sort((x, y) => (x.capacityTonnes ?? 0) - (y.capacityTonnes ?? 0))[0]
  const smaller = others
    .filter((m) => (m.capacityTonnes ?? 0) < cap && m.capacityTonnes)
    .sort((x, y) => (y.capacityTonnes ?? 0) - (x.capacityTonnes ?? 0))[0]
  const same = others.find((m) => m.capacityTonnes === cap)
  const noun = b.machine.title.replace(/^[\d.]+t\s*/, '').toLowerCase()
  const desc: Record<SwapOptionId, { text: string; photo: string | undefined }> = {
    same: {
      text: `Swap for another ${cap ? `${cap}t ` : ''}${noun} at no additional cost.`,
      photo: (same ?? b.machine).photos[0],
    },
    upgrade: {
      text: `Move to a ${sizeLabel(bigger, `larger ${noun}`)} for more power.`,
      photo: (bigger ?? b.machine).photos[0],
    },
    downgrade: {
      text: `Switch to a ${sizeLabel(smaller, `smaller ${noun}`)} and save.`,
      photo: (smaller ?? b.machine).photos[0],
    },
  }

  return (
    <AppScreen
      hideNav
      footer={
        <Button
          arrow
          loading={swap.isPending}
          onClick={() => swap.mutate(choice, { onSuccess: () => navigate(`/hires/${b.id}`) })}
        >
          Confirm Smart Swap
        </Button>
      }
    >
      <ScreenTitle
        title="Smart Swap"
        subtitle="Need a different machine? Swap it without the hassle."
      />
      <Card className="flex items-center gap-4 border-primary bg-gradient-to-b from-selected to-[#012a57] py-4">
        <Repeat2 className="size-9 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
        <div>
          <p className="font-semibold">Same class. No downtime.</p>
          <p className="text-sm text-[#dae4ef]">Keep your project moving.</p>
        </div>
      </Card>
      <div role="radiogroup" aria-label="Swap option" className="mt-3 space-y-2">
        {SWAP_OPTIONS.map((o) => (
          <SelectableCard
            key={o.id}
            selected={choice === o.id}
            onSelect={() => setChoice(o.id)}
            indicator={choice === o.id ? 'check' : 'radio'}
            indicatorPosition="top-right"
            className="items-start"
            icon={
              <Thumbnail
                src={desc[o.id].photo?.replace('.webp', '-sm.webp')}
                alt=""
                className="h-[68px] w-[60px]"
              />
            }
            label={`${o.title}, ${o.delta === 0 ? 'free' : `${o.delta > 0 ? 'plus' : 'minus'} ${formatMoney(Math.abs(o.delta))} per day`}`}
            title={<span className="text-sm font-medium">{o.title}</span>}
          >
            <span
              className={cn(
                'block text-lg font-bold',
                o.delta === 0 ? 'text-[#3ddc84]' : 'text-[#f7b84b]',
              )}
            >
              {o.delta === 0
                ? 'Free'
                : `${o.delta > 0 ? '+' : '−'} ${formatMoney(Math.abs(o.delta))} / day`}
            </span>
            <span className="mt-0.5 block pr-6 text-[13px] text-muted">{desc[o.id].text}</span>
          </SelectableCard>
        ))}
      </div>
      <InfoNote className="mt-3" icon={<Info className="size-5 text-[#dae4ef]" />}>
        <span className="block font-medium text-fg">New machine available from tomorrow</span>
        Supplier will confirm availability and collection details.
      </InfoNote>
    </AppScreen>
  )
}
