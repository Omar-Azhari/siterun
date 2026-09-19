import { Crown, Eye, HardHat, Users } from 'lucide-react'
import type { MemberRole } from '@/data/types'

export const ROLE_CARDS: {
  value: MemberRole
  title: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    value: 'owner',
    title: 'Owner',
    description: 'Full access and billing',
    icon: <Crown className="size-7 fill-warning/80 text-warning" strokeWidth={1.5} />,
  },
  {
    value: 'project_manager',
    title: 'Project Manager',
    description: 'Manage bookings and team',
    icon: <Users className="size-7 fill-primary text-primary" strokeWidth={1.5} />,
  },
  {
    value: 'site_manager',
    title: 'Site Manager',
    description: 'On-site operations and machine access',
    icon: <HardHat className="size-7 fill-warning/80 text-warning" strokeWidth={1.5} />,
  },
  {
    value: 'viewer',
    title: 'Viewer',
    description: 'View bookings and reports',
    icon: <Eye className="size-7 text-primary" strokeWidth={2} />,
  },
]
