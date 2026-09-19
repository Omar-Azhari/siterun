import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { AppHeader } from '../ui/AppHeader'
import { BottomNav } from '../navigation/BottomNav'
import { SideNav } from '../navigation/SideNav'
import type { NavRole } from '../navigation/navConfig'

interface ScreenProps {
  children: ReactNode
  /** Header props, or `false` for full-bleed screens (Splash). */
  header?: ComponentProps<typeof AppHeader> | false
  /** Shows the role's bottom nav. */
  nav?: NavRole
  /** Sticky action area above the nav (primary buttons). */
  footer?: ReactNode
  className?: string
  /** Remove side padding (edge-to-edge maps/photos). */
  flush?: boolean
  /** Signed-in screens: the role's sidebar on desktop widths. */
  sidebar?: NavRole
}

/** Mobile screen shell: header, scrolling content, sticky footer, bottom nav. */
export function Screen({
  children,
  header = {},
  nav,
  footer,
  className,
  flush,
  sidebar,
}: ScreenProps) {
  return (
    <div className={cn(sidebar && 'md:pl-60')}>
      {sidebar && <SideNav role={sidebar} />}
      <div
        className={cn(
          'mx-auto flex min-h-dvh w-full max-w-lg flex-col pt-[env(safe-area-inset-top)]',
          sidebar && 'md:max-w-2xl md:px-4',
        )}
      >
        {header !== false && (
          <div className="sticky top-0 z-20 bg-app/95 backdrop-blur">
            <AppHeader {...header} />
          </div>
        )}
        <main className={cn('flex-1 pt-1 pb-4', !flush && 'px-4', className)}>{children}</main>
        {footer && (
          <div
            className={cn(
              'sticky z-20 space-y-2.5 bg-gradient-to-t from-app from-70% to-transparent px-4 pt-4 pb-4',
              nav
                ? 'bottom-[calc(56px+env(safe-area-inset-bottom))] md:bottom-0'
                : 'bottom-0 pb-[calc(16px+env(safe-area-inset-bottom))]',
            )}
          >
            {footer}
          </div>
        )}
        {nav && (
          <>
            <div aria-hidden className="h-[calc(56px+env(safe-area-inset-bottom))] md:hidden" />
            <BottomNav role={nav} />
          </>
        )}
      </div>
    </div>
  )
}
