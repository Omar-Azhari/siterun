import type { ReactNode } from 'react'
import { LazyMotion } from 'framer-motion'

const loadFeatures = () => import('./motionFeatures').then((m) => m.default)

/** Lets `m.*` components animate once the features chunk arrives. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  )
}
