import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CircleUserRound,
  ClipboardCheck,
  FileCheck2,
  Forklift,
  House,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Search,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export type NavRole = 'contractor' | 'supplier' | 'operator' | 'admin'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Other path prefixes that should highlight this item. */
  match?: string[]
  /** `end` = only exact match highlights (for role home routes). */
  end?: boolean
}

export const NAV: Record<NavRole, NavItem[]> = {
  contractor: [
    { label: 'Home', to: '/home', icon: House, match: ['/browse'] },
    { label: 'Search', to: '/search', icon: Search, match: ['/machines'] },
    { label: 'Hires', to: '/hires', icon: BriefcaseBusiness, match: ['/bookings'] },
    { label: 'Messages', to: '/messages', icon: MessageSquareText },
    {
      label: 'Account',
      to: '/account',
      icon: CircleUserRound,
      match: ['/payments', '/invoices', '/sites', '/team', '/plans', '/support', '/notifications'],
    },
  ],
  supplier: [
    { label: 'Home', to: '/supplier', icon: House, end: true, match: ['/supplier/performance'] },
    {
      label: 'Machines',
      to: '/supplier/machines',
      icon: Forklift,
      match: ['/supplier/compliance'],
    },
    {
      label: 'Bookings',
      to: '/supplier/dispatch',
      icon: CalendarDays,
      match: ['/supplier/requests', '/supplier/bookings'],
    },
    { label: 'Payouts', to: '/supplier/payouts', icon: Wallet },
    { label: 'Account', to: '/account', icon: CircleUserRound, match: ['/support', '/messages'] },
  ],
  operator: [
    { label: 'Home', to: '/operator', icon: House, end: true },
    { label: 'Bookings', to: '/operator/bookings', icon: CalendarDays },
    { label: 'Documents', to: '/operator/documents', icon: FileCheck2 },
    { label: 'Messages', to: '/messages', icon: MessageSquareText },
    { label: 'Account', to: '/account', icon: CircleUserRound },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
    { label: 'Approvals', to: '/admin/approvals', icon: ClipboardCheck },
    { label: 'Suppliers', to: '/admin/suppliers', icon: Building2 },
    { label: 'Bookings', to: '/admin/bookings', icon: CalendarDays },
    { label: 'More', to: '/admin/more', icon: Menu },
  ],
}

export function isNavActive(item: NavItem, pathname: string): boolean {
  const hit = (p: string, exact?: boolean) =>
    exact ? pathname === p : pathname === p || pathname.startsWith(p + '/')
  return hit(item.to, item.end) || (item.match ?? []).some((p) => hit(p))
}
