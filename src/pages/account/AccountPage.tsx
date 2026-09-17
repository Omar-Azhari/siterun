import { useNavigate } from 'react-router-dom'
import {
  Building2,
  ChartColumn,
  CircleHelp,
  CreditCard,
  FileText,
  LogOut,
  MapPinned,
  ShieldCheck,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { Avatar, Button, ListRow, ScreenTitle, Skeleton } from '@/components/ui'
import { getApi } from '@/data/client'
import { useMe } from '@/data/hooks'
import { ACCOUNT_LABELS, areaFor, ROLE_LABELS } from '@/auth/roles'

type Row = { title: string; subtitle: string; to: string; icon: LucideIcon }

/** Board 05 · Account & Settings (shared by every role, rows vary). */
export function AccountPage() {
  const navigate = useNavigate()
  const { data: me } = useMe()

  if (!me)
    return (
      <AppScreen root>
        <Skeleton className="h-20" />
      </AppScreen>
    )

  const area = areaFor(me)
  const groups: Row[][] = []
  if (area !== 'admin') {
    groups.push([
      { title: 'Company Details', subtitle: me.org?.name ?? 'Add your business details', to: '/account/company', icon: Building2 },
      ...(area === 'contractor'
        ? [
            { title: 'Team & Permissions', subtitle: 'Manage team access', to: '/team', icon: UsersRound },
            { title: 'Your Sites', subtitle: 'Project sites and access windows', to: '/sites', icon: MapPinned },
          ]
        : []),
      ...(area === 'supplier'
        ? [
            { title: 'Performance', subtitle: 'Hires, utilisation and revenue', to: '/supplier/performance', icon: ChartColumn },
            { title: 'Compliance', subtitle: 'Documents and expiry alerts', to: '/supplier/compliance/alerts', icon: ShieldCheck },
          ]
        : []),
      ...(area === 'operator' ? [{ title: 'My Documents', subtitle: 'Licences, VOCs and inductions', to: '/operator/documents', icon: ShieldCheck }] : []),
      ...(area === 'contractor'
        ? [{ title: 'Payment Settings', subtitle: 'Cards, plans and SiteCredits', to: '/account/payment-settings', icon: CreditCard }]
        : area === 'supplier'
          ? [{ title: 'Payout Settings', subtitle: 'Bank account and payouts', to: '/account/payment-settings', icon: Wallet }]
          : []),
    ])
  }
  groups.push([
    { title: 'Help & Support', subtitle: 'FAQs, contact us', to: '/support', icon: CircleHelp },
    { title: 'Privacy & Security', subtitle: 'Your data and preferences', to: '/account/privacy', icon: ShieldCheck },
    { title: 'Terms of Service', subtitle: 'Legal information', to: '/terms', icon: FileText },
  ])

  const roleLabel = me.profile.isPlatformAdmin
    ? 'SiteRun Platform Admin'
    : me.role === 'owner'
      ? 'Administrator'
      : me.role
        ? ROLE_LABELS[me.role]
        : ACCOUNT_LABELS[me.profile.accountType]

  const logOut = async () => {
    await getApi().signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AppScreen root>
      <ScreenTitle title="Account & Settings" subtitle="Manage your company, team and preferences." />
      <ListRow
        to="/account/profile"
        leading={<Avatar name={me.profile.fullName} size="lg" className="size-14 text-lg" />}
        title={me.profile.fullName}
        subtitle={me.profile.email}
        meta={roleLabel}
      />
      {groups.map((g, i) => (
        <div key={i} className="mt-3 space-y-2">
          {g.map((r) => (
            <ListRow key={r.to} to={r.to} leading={<r.icon className="size-7 text-[#dae4ef]" strokeWidth={1.5} aria-hidden />} title={r.title} subtitle={r.subtitle} />
          ))}
        </div>
      ))}
      <Button variant="danger" className="mt-4 justify-start pl-4" leftIcon={<LogOut className="size-6" />} onClick={logOut}>
        Log Out
      </Button>
    </AppScreen>
  )
}
