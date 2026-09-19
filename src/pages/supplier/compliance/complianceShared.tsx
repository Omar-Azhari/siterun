import {
  BarChart3,
  CircleCheck,
  Clock,
  FileText,
  HardHat,
  IdCard,
  ShieldCheck,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import { CraneIcon } from '@/components/ui/icons/Plant'
import type { DocState } from './complianceUtils'

export function RequirementIcon({
  icon,
  className = 'size-8',
}: {
  icon: string
  className?: string
}) {
  const props = { className, strokeWidth: 1.4, 'aria-hidden': true as const }
  switch (icon) {
    case 'shield':
      return <ShieldCheck {...props} />
    case 'wrench':
      return <Wrench {...props} />
    case 'crane':
      return <CraneIcon {...props} />
    case 'chart':
      return <BarChart3 {...props} />
    case 'id':
      return <IdCard {...props} />
    case 'hardhat':
      return <HardHat {...props} />
    default:
      return <FileText {...props} />
  }
}

export function StateIcon({ state }: { state: DocState }) {
  if (state === 'verified')
    return <CircleCheck className="size-7 fill-success text-app" aria-hidden />
  if (state === 'pending') return <Clock className="size-7 fill-primary text-app" aria-hidden />
  if (state === 'missing')
    return <FileText className="size-7 text-subtle" strokeWidth={1.5} aria-hidden />
  return <TriangleAlert className="size-7 fill-danger text-app" aria-hidden />
}
