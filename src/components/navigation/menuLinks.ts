import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartColumn,
  CircleHelp,
  CreditCard,
  FileText,
  MapPinned,
  MessageSquareText,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { AppArea } from '@/auth/roles'

/** Secondary destinations per area: the mobile menu drawer and the desktop sidebar. */
export const MENU_LINKS: Record<AppArea, { label: string; to: string; icon: LucideIcon }[]> = {
  contractor: [
    { label: 'Your Sites', to: '/sites', icon: MapPinned },
    { label: 'Bookings Calendar', to: '/bookings', icon: CalendarDays },
    { label: 'Active Hires', to: '/hires', icon: BriefcaseBusiness },
    { label: 'Messages', to: '/messages', icon: MessageSquareText },
    { label: 'Payments', to: '/payments', icon: CreditCard },
    { label: 'Invoices & Statements', to: '/invoices', icon: FileText },
    { label: 'Team & Permissions', to: '/team', icon: Users },
    { label: 'Plans & SiteCredits', to: '/plans', icon: Wallet },
    { label: 'Notifications', to: '/notifications', icon: Bell },
    { label: 'Help & Support', to: '/support', icon: CircleHelp },
  ],
  supplier: [
    { label: 'Performance', to: '/supplier/performance', icon: ChartColumn },
    { label: 'Booking Requests', to: '/supplier/requests', icon: Bell },
    { label: 'Bookings & Dispatch', to: '/supplier/dispatch', icon: CalendarDays },
    { label: 'Machines', to: '/supplier/machines', icon: BriefcaseBusiness },
    { label: 'Compliance', to: '/supplier/compliance', icon: ShieldCheck },
    { label: 'Compliance Alerts', to: '/supplier/compliance/alerts', icon: ShieldCheck },
    { label: 'Payouts', to: '/supplier/payouts', icon: Wallet },
    { label: 'Messages', to: '/messages', icon: MessageSquareText },
    { label: 'Help & Support', to: '/support', icon: CircleHelp },
  ],
  operator: [
    { label: 'Assigned Bookings', to: '/operator/bookings', icon: CalendarDays },
    { label: 'My Documents', to: '/operator/documents', icon: ShieldCheck },
    { label: 'Messages', to: '/messages', icon: MessageSquareText },
    { label: 'Help & Support', to: '/support', icon: CircleHelp },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin', icon: ChartColumn },
    { label: 'Approvals', to: '/admin/approvals', icon: ShieldCheck },
    { label: 'Suppliers', to: '/admin/suppliers', icon: Building2 },
    { label: 'Bookings', to: '/admin/bookings', icon: CalendarDays },
  ],
}
