import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { isNavActive, NAV, type NavRole } from './navConfig'

interface BottomNavProps {
  role: NavRole
  /** Unread counts keyed by item label ("Messages"). */
  badges?: Partial<Record<string, number>>
  /** Pin to the viewport (app) or render inline (component gallery). */
  fixed?: boolean
  className?: string
}

export function BottomNav({ role, badges = {}, fixed = true, className }: BottomNavProps) {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label="Main"
      className={cn(
        'border-t border-line bg-app/95 pb-[env(safe-area-inset-bottom)] backdrop-blur',
        fixed && 'fixed inset-x-0 bottom-0 z-30 md:hidden',
        className,
      )}
    >
      <ul className="mx-auto flex max-w-lg">
        {NAV[role].map((item) => {
          const active = isNavActive(item, pathname)
          const badge = badges[item.label]
          const Icon = item.icon
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 text-[11px] transition-colors',
                  active ? 'font-semibold text-primary' : 'text-subtle hover:text-muted',
                )}
              >
                <span className="relative">
                  <Icon
                    aria-hidden
                    className="size-6"
                    strokeWidth={1.75}
                    fill={active ? 'currentColor' : 'none'}
                    fillOpacity={active ? 0.22 : 0}
                  />
                  {badge ? (
                    <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                      {badge > 9 ? '9+' : badge}
                      <span className="sr-only"> unread</span>
                    </span>
                  ) : null}
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
