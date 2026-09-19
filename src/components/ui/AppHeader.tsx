import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Menu } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { cn } from '@/lib/cn'
import { IconButton } from './Button'

interface AppHeaderProps {
  /** `back` on pushed screens, `menu` on root screens. */
  leading?: 'back' | 'menu' | 'none'
  onBack?: () => void
  onMenu?: () => void
  /** Bell with optional unread dot. Pass `false` to hide. */
  bell?: boolean
  unread?: boolean
  /** Replaces the bell. */
  trailing?: ReactNode
  /** The desktop sidebar already shows the logo and menu. */
  withSidebar?: boolean
}

export function AppHeader({
  leading = 'back',
  onBack,
  onMenu,
  bell = true,
  unread = false,
  trailing,
  withSidebar = false,
}: AppHeaderProps) {
  const navigate = useNavigate()
  return (
    <header className="grid h-14 grid-cols-[44px_1fr_44px] items-center px-2">
      <div>
        {leading === 'back' && (
          <IconButton label="Go back" onClick={onBack ?? (() => navigate(-1))}>
            <ArrowLeft className="size-[22px]" strokeWidth={1.75} />
          </IconButton>
        )}
        {leading === 'menu' && (
          <IconButton
            label="Open menu"
            onClick={onMenu}
            className={cn(withSidebar && 'md:invisible')}
          >
            <Menu className="size-[22px]" strokeWidth={1.75} />
          </IconButton>
        )}
      </div>
      <Link
        to="/"
        className={cn('mx-auto rounded-md', withSidebar && 'md:invisible')}
        aria-label="SiteRun home"
      >
        <Logo className="h-[22px]" title="SiteRun" />
      </Link>
      <div>
        {trailing ??
          (bell && (
            <Link
              to="/notifications"
              aria-label={unread ? 'Notifications, unread' : 'Notifications'}
              className="relative inline-flex size-11 items-center justify-center rounded-xl hover:bg-white/5"
            >
              <Bell className="size-[22px]" strokeWidth={1.75} />
              {unread && (
                <span className="absolute top-2.5 right-3 size-2 rounded-full bg-danger ring-2 ring-app" />
              )}
            </Link>
          ))}
      </div>
    </header>
  )
}
