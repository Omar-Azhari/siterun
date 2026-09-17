import { useState, type ComponentProps, type ReactNode } from 'react'
import { useMe, useNotifications } from '@/data/hooks'
import { navRoleFor } from '@/auth/roles'
import { Screen } from './Screen'
import { NavDrawer } from './NavDrawer'

interface AppScreenProps extends Omit<ComponentProps<typeof Screen>, 'header' | 'nav'> {
  /** `root` screens get the menu button; others get back. */
  root?: boolean
  /** Hide the bottom nav (wizards, checkout steps). */
  hideNav?: boolean
  onBack?: () => void
  headerTrailing?: ReactNode
  bell?: boolean
}

/** A signed-in screen: role nav, unread bell and menu drawer wired up. */
export function AppScreen({
  root,
  hideNav,
  onBack,
  headerTrailing,
  bell = true,
  ...rest
}: AppScreenProps) {
  const { data: me } = useMe()
  const { data: notes } = useNotifications(!!me)
  const [menu, setMenu] = useState(false)
  const unread = !!notes?.some((n) => !n.read)
  return (
    <>
      <Screen
        {...rest}
        nav={hideNav ? undefined : navRoleFor(me)}
        header={{
          leading: root ? 'menu' : 'back',
          onMenu: () => setMenu(true),
          onBack,
          unread,
          bell,
          trailing: headerTrailing,
        }}
      />
      {root && <NavDrawer open={menu} onClose={() => setMenu(false)} />}
    </>
  )
}
