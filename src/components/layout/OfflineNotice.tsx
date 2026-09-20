import { useSyncExternalStore } from 'react'
import { WifiOff } from 'lucide-react'

const subscribe = (cb: () => void) => {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

/** Bar shown while the device has no connection; cached screens keep working. */
export function OfflineNotice() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
  if (online) return null
  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-warning/15 px-4 py-2 text-[13px] text-warning"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      You’re offline. Some information may be out of date.
    </div>
  )
}
