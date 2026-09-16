import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { IconButton } from './Button'

const WEEK = { weekStartsOn: 1 } as const

interface MonthNavProps {
  month: Date
  onPrev: () => void
  onNext: () => void
  className?: string
}

/** "‹  June 2025  ›" */
export function MonthNav({ month, onPrev, onNext, className }: MonthNavProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <IconButton label="Previous month" onClick={onPrev}>
        <ChevronLeft className="size-5" />
      </IconButton>
      <h2 className="font-display text-base font-semibold" aria-live="polite">
        {format(month, 'MMMM yyyy')}
      </h2>
      <IconButton label="Next month" onClick={onNext}>
        <ChevronRight className="size-5" />
      </IconButton>
    </div>
  )
}

interface DayPickerProps {
  selected: Date
  onSelect: (day: Date) => void
  /** Days that have bookings get a small dot. */
  marked?: Date[]
  className?: string
}

const dayButton = (active: boolean, today: boolean) =>
  cn(
    'relative flex size-10 items-center justify-center rounded-xl text-[15px] transition-colors',
    active ? 'bg-primary font-semibold text-white' : 'text-fg hover:bg-white/5',
    !active && today && 'ring-1 ring-primary/60',
  )

/** Mon–Sun row for the week containing `selected` (boards 05, 09). */
export function WeekStrip({ selected, onSelect, marked = [], className }: DayPickerProps) {
  const start = startOfWeek(selected, WEEK)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return (
    <div className={cn('grid grid-cols-7 text-center', className)} role="group" aria-label="Week">
      {days.map((d) => (
        <span key={`h-${d.toISOString()}`} aria-hidden className="pb-1.5 text-xs text-[#c3ccd8]">
          {format(d, 'EEE')}
        </span>
      ))}
      {days.map((d) => {
        const active = isSameDay(d, selected)
        const hasMark = marked.some((m) => isSameDay(m, d))
        return (
          <div key={d.toISOString()} className="flex justify-center">
            <button
              type="button"
              onClick={() => onSelect(d)}
              aria-pressed={active}
              aria-label={format(d, 'EEEE d MMMM') + (hasMark ? ', has bookings' : '')}
              className={dayButton(active, isToday(d))}
            >
              {format(d, 'd')}
              {hasMark && !active && (
                <span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-primary" />
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}

/** Full month grid, Monday first. */
export function MonthGrid({
  selected,
  onSelect,
  marked = [],
  className,
  month,
}: DayPickerProps & { month: Date }) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), WEEK),
    end: endOfWeek(endOfMonth(month), WEEK),
  })
  return (
    <div
      className={cn('grid grid-cols-7 gap-y-1 text-center', className)}
      role="group"
      aria-label={format(month, 'MMMM yyyy')}
    >
      {days.slice(0, 7).map((d) => (
        <span key={`h-${d.toISOString()}`} aria-hidden className="pb-1 text-xs text-[#c3ccd8]">
          {format(d, 'EEE')}
        </span>
      ))}
      {days.map((d) => {
        const active = isSameDay(d, selected)
        const hasMark = marked.some((m) => isSameDay(m, d))
        const outside = !isSameMonth(d, month)
        return (
          <div key={d.toISOString()} className="flex justify-center">
            <button
              type="button"
              onClick={() => onSelect(d)}
              aria-pressed={active}
              aria-label={format(d, 'EEEE d MMMM') + (hasMark ? ', has bookings' : '')}
              className={cn(dayButton(active, isToday(d)), outside && !active && 'text-subtle')}
            >
              {format(d, 'd')}
              {hasMark && !active && (
                <span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-primary" />
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}
