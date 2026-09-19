import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { LogOut, X } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Avatar, IconButton } from '@/components/ui'
import { getApi } from '@/data/client'
import { useMe } from '@/data/hooks'
import { ACCOUNT_LABELS, areaFor } from '@/auth/roles'
import { MENU_LINKS } from '../navigation/menuLinks'

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
          <m.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <m.div
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
              {MENU_LINKS[areaFor(me)].map((l) => (
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
          </m.div>
        </div>
      )}
    </AnimatePresence>
  )
}
