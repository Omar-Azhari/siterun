import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Avatar } from '@/components/ui'
import { getApi } from '@/data/client'
import { useMe } from '@/data/hooks'
import { ACCOUNT_LABELS, areaFor } from '@/auth/roles'
import { cn } from '@/lib/cn'
import { MENU_LINKS } from './menuLinks'
import { isNavActive, NAV, type NavRole } from './navConfig'

/** Desktop (≥768px) replacement for the bottom nav and the menu drawer. */
export function SideNav({ role }: { role: NavRole }) {
  const { data: me } = useMe()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  if (!me) return null
  const primary = NAV[role]
  const secondary = MENU_LINKS[areaFor(me)].filter((l) => !primary.some((p) => p.to === l.to))
  const secondaryActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`)
  // The more specific "More" link wins over a primary item that also matches.
  const anySecondary = secondary.some((l) => secondaryActive(l.to))

  const logOut = async () => {
    await getApi().signOut()
    navigate('/login', { replace: true })
  }

  const item = (
    to: string,
    label: string,
    Icon: (typeof primary)[number]['icon'],
    active: boolean,
  ) => (
    <Link
      key={to}
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-10 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors',
        active ? 'bg-primary/15 font-semibold text-primary' : 'text-fg hover:bg-white/5',
      )}
    >
      <Icon
        className={cn('size-5', active ? 'text-primary' : 'text-[#dae4ef]')}
        strokeWidth={1.75}
        aria-hidden
      />
      {label}
    </Link>
  )

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-app md:flex">
      <Link to="/" className="flex h-16 items-center px-5" aria-label="SiteRun home">
        <Logo className="h-6" />
      </Link>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="space-y-0.5">
          {primary.map((p) =>
            item(p.to, p.label, p.icon, !anySecondary && isNavActive(p, pathname)),
          )}
        </div>
        {secondary.length > 0 && (
          <>
            <p className="mt-5 mb-1.5 px-3 text-xs font-semibold tracking-wide text-subtle uppercase">
              More
            </p>
            <div className="space-y-0.5">
              {secondary.map((l) => item(l.to, l.label, l.icon, secondaryActive(l.to)))}
            </div>
          </>
        )}
      </nav>
      <div className="border-t border-line p-3">
        <Link to="/account" className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/5">
          <Avatar name={me.profile.fullName} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{me.profile.fullName}</span>
            <span className="block truncate text-xs text-muted">
              {me.org?.name ??
                (me.profile.isPlatformAdmin
                  ? 'SiteRun Platform Admin'
                  : ACCOUNT_LABELS[me.profile.accountType])}
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={logOut}
          className="mt-1 flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-[#f87171] hover:bg-danger/10"
        >
          <LogOut className="size-5" aria-hidden />
          Log Out
        </button>
      </div>
    </aside>
  )
}
