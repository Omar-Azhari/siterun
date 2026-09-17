import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartColumn,
  CircleHelp,
  CreditCard,
  FileText,
  LogOut,
  MapPinned,
  MessageSquareText,
  ShieldCheck,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Avatar, IconButton } from '@/components/ui'
import { getApi } from '@/data/client'
import { useMe } from '@/data/hooks'
import { ACCOUNT_LABELS, areaFor, type AppArea } from '@/auth/roles'

const LINKS: Record<AppArea, { label: string; to: string; icon: LucideIcon }[]> = {
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

export function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: me } = useMe()
  const navigate = useNavigate()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const logOut = async () => {
    onClose()
    await getApi().signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AnimatePresence>
      {open && me && (
        <div className="fixed inset-0 z-40">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            tabIndex={-1}
            className="absolute inset-y-0 left-0 flex w-[84%] max-w-xs flex-col border-r border-line bg-app pt-[env(safe-area-inset-top)] outline-none"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
          >
            <div className="flex h-14 items-center justify-between pr-2 pl-4">
              <Logo className="h-[22px]" />
              <IconButton label="Close menu" onClick={onClose}>
                <X className="size-5" />
              </IconButton>
            </div>
            <Link
              to="/account"
              onClick={onClose}
              className="mx-3 flex items-center gap-3 rounded-xl border border-line bg-card p-3"
            >
              <Avatar name={me.profile.fullName} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{me.profile.fullName}</p>
                <p className="truncate text-xs text-muted">
                  {me.org?.name ??
                    (me.profile.isPlatformAdmin
                      ? 'SiteRun Platform Admin'
                      : ACCOUNT_LABELS[me.profile.accountType])}
                </p>
              </div>
            </Link>
            <nav aria-label="Menu" className="mt-3 flex-1 overflow-y-auto px-2">
              {LINKS[areaFor(me)].map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={onClose}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] text-fg hover:bg-white/5"
                >
                  <l.icon className="size-5 text-primary" strokeWidth={1.75} aria-hidden />
                  {l.label}
                </Link>
              ))}
            </nav>
            <button
              type="button"
              onClick={logOut}
              className="m-3 flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] text-[#f87171] hover:bg-danger/10"
            >
              <LogOut className="size-5" aria-hidden />
              Log Out
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
