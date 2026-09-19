import { Cog, Forklift, Shovel, Tractor } from 'lucide-react'
import {
  CraneIcon,
  ExcavatorIcon,
  GeneratorIcon,
  ScissorLiftIcon,
} from '@/components/ui/icons/Plant'

type IconLike = (props: { className?: string; strokeWidth?: number }) => React.ReactNode

const ICONS: Record<string, IconLike> = {
  excavator: ExcavatorIcon,
  telehandler: (p) => <Forklift {...p} />,
  crane: CraneIcon,
  generator: GeneratorIcon,
  access: ScissorLiftIcon,
  attachment: (p) => <Shovel {...p} />,
  loader: (p) => <Tractor {...p} />,
  other: (p) => <Cog {...p} />,
}

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const render = ICONS[icon] ?? ICONS.other
  return <>{render?.({ className, strokeWidth: 1.4 })}</>
}
