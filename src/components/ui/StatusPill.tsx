import { CircleCheck } from 'lucide-react'
import { cn } from '@/lib/cn'
import { STATUS_STYLES, type Mark, type StatusKey, type Tone } from './statusStyles'

const tones: Record<Tone, string> = {
  success: 'bg-success/15 text-[#3ddc84]',
  warning: 'bg-warning/15 text-[#f7b84b]',
  danger: 'bg-danger/15 text-[#f87171]',
  info: 'bg-info/20 text-[#60a5fa]',
  neutral: 'bg-white/10 text-[#d3dae4]',
}

const dotColor: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-muted',
}

interface StatusPillProps {
  status?: StatusKey
  /** Free-form pill ("Due in 5 days", "Most Popular"). */
  label?: string
  tone?: Tone
  mark?: Mark
  className?: string
  size?: 'sm' | 'md'
}

export function StatusPill({ status, label, tone, mark, className, size = 'sm' }: StatusPillProps) {
  const preset = status ? STATUS_STYLES[status] : undefined
  const t: Tone = tone ?? preset?.tone ?? 'neutral'
  const m: Mark = mark ?? preset?.mark ?? 'none'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
        size === 'sm' ? 'h-6 px-2.5 text-xs' : 'h-7 px-3 text-[13px]',
        tones[t],
        className,
      )}
    >
      {m === 'dot' && <span aria-hidden className={cn('size-2 rounded-full', dotColor[t])} />}
      {m === 'check' && <CircleCheck aria-hidden className="size-3.5" strokeWidth={2.25} />}
      {label ?? preset?.label}
    </span>
  )
}
