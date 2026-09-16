import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { cardClass } from './Card'

interface StatTileProps {
  icon?: ReactNode
  label: string
  value: ReactNode
  /** Percentage change; sign sets the arrow and colour. */
  trend?: number
  /** Icon beside the text (board 10) or above it (board 09 small tiles). */
  layout?: 'row' | 'stack'
  className?: string
}

export function StatTile({ icon, label, value, trend, layout = 'row', className }: StatTileProps) {
  return (
    <div
      className={cn(
        cardClass,
        'flex gap-3 p-3.5',
        layout === 'stack' ? 'flex-col gap-1' : 'items-start',
        className,
      )}
    >
      {icon && <span className="shrink-0 text-primary [&_svg]:size-8">{icon}</span>}
      <div className="min-w-0">
        {layout === 'row' && <p className="text-[13px] text-[#dae4ef]">{label}</p>}
        <p className="font-display text-2xl leading-tight font-bold text-fg">{value}</p>
        {layout === 'stack' && <p className="text-[13px] text-[#dae4ef]">{label}</p>}
        {trend !== undefined && <Trend value={trend} />}
      </div>
    </div>
  )
}

export function Trend({ value, className }: { value: number; className?: string }) {
  const up = value >= 0
  const Icon = up ? ArrowUp : ArrowDown
  return (
    <p
      className={cn(
        'mt-0.5 inline-flex items-center gap-1 text-[13px] font-medium',
        up ? 'text-[#3ddc84]' : 'text-[#f87171]',
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" strokeWidth={2.5} />
      <span className="sr-only">{up ? 'Up' : 'Down'}</span>
      {Math.abs(value)}%
    </p>
  )
}
