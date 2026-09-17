import type { NavRole } from '@/components/navigation/navConfig'
import type { Me } from '@/data/types'

export type AppArea = 'contractor' | 'supplier' | 'operator' | 'admin'

/** Which part of the app a signed-in user belongs to. */
export function areaFor(me: Me): AppArea {
  if (me.profile.isPlatformAdmin) return 'admin'
  if (me.profile.accountType === 'operator') return 'operator'
  if (me.profile.accountType === 'supplier' || me.org?.kind === 'supplier') return 'supplier'
  return 'contractor'
}

export function navRoleFor(me: Me | null | undefined): NavRole | undefined {
  return me ? areaFor(me) : undefined
}

export function homePathFor(me: Me): string {
  switch (areaFor(me)) {
    case 'admin':
      return '/admin'
    case 'operator':
      return '/operator'
    case 'supplier':
      return '/supplier'
    default:
      return '/home'
  }
}

export function needsOnboarding(me: Me): boolean {
  return !me.profile.isPlatformAdmin && !me.org
}

export const ROLE_LABELS = {
  owner: 'Owner',
  project_manager: 'Project Manager',
  site_manager: 'Site Manager',
  viewer: 'Viewer',
} as const

export const ACCOUNT_LABELS = {
  contractor: 'Contractor',
  supplier: 'Supplier',
  operator: 'Operator',
  org_admin: 'Administrator',
} as const
