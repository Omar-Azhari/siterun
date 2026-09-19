import type { ReactNode } from 'react'
import { m, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'

// Confetti dashes around the tick: [x, y, rotation, colour] relative to centre.
const DASHES: [number, number, number, string][] = [
  [-78, -34, -35, '#ef4444'],
  [-62, -58, 40, '#22c55e'],
  [-84, 4, 10, '#f5a524'],
  [-66, 30, -20, '#22c55e'],
  [-92, -12, 70, '#006cff'],
  [-54, 46, 35, '#ef4444'],
  [70, -48, -30, '#f5a524'],
  [84, -24, 20, '#f5a524'],
  [66, -6, -10, '#22c55e'],
  [90, 12, 60, '#006cff'],
  [72, 34, -40, '#f5a524'],
  [56, -62, 55, '#22c55e'],
]

interface SuccessStateProps {
  title: string
  description?: ReactNode
  children?: ReactNode
}

export function SuccessState({ title, description, children }: SuccessStateProps) {
  const reduce = useReducedMotion()
  return (
    <div className="flex flex-col items-center text-center" role="status">
      <div className="relative flex h-32 w-56 items-center justify-center">
        {DASHES.map(([x, y, r, c], i) => (
          <m.span
            key={i}
            aria-hidden
            className="absolute h-1 w-2.5 rounded-full"
            style={{ background: c, left: '50%', top: '50%' }}
            initial={reduce ? false : { opacity: 0, x: 0, y: 0, rotate: r }}
            animate={{ opacity: 1, x, y, rotate: r }}
            transition={{ delay: 0.25 + i * 0.02, duration: 0.5, ease: 'easeOut' }}
          />
        ))}
        <m.div
          className="flex size-[88px] items-center justify-center rounded-full border-[3px] border-success bg-success/10 shadow-[0_0_24px_rgba(34,197,94,0.35)]"
          initial={reduce ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        >
          <m.span
            initial={reduce ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 15 }}
          >
            <Check aria-hidden className="size-12 text-success" strokeWidth={3} />
          </m.span>
        </m.div>
      </div>
      <h1 className="mt-1 font-display text-2xl font-bold text-fg">{title}</h1>
      {description && <p className="mt-2 max-w-[18rem] text-sm text-muted">{description}</p>}
      {children}
    </div>
  )
}
