import { useEffect, useState } from 'react'
import { Navigation } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { startLiveShare, stopLiveShare, useLiveShare } from '@/lib/liveLocation'

const secondsAgo = (at: number) => {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000))
  return s < 60 ? `${s}s ago` : `${Math.round(s / 60)} min ago`
}

/**
 * Driver's control for sharing live GPS on a delivery that is on its way. The customer
 * sees the truck move on their tracking map while this is on.
 */
export function LiveLocationCard({ bookingId }: { bookingId: string }) {
  const share = useLiveShare()
  const mine = share.bookingId === bookingId
  const active = mine && (share.status === 'sharing' || share.status === 'starting')
  const [, tick] = useState(0)

  useEffect(() => {
    if (!active) return
    const t = window.setInterval(() => tick((n) => n + 1), 5000)
    return () => window.clearInterval(t)
  }, [active])

  const status = !mine
    ? 'The customer can follow the truck on their tracking map while you share. Keep SiteRun open during the drive.'
    : share.status === 'starting'
      ? 'Finding your location…'
      : share.status === 'sharing'
        ? (share.message ??
          `Sharing with the customer · sent ${share.lastSentAt ? secondsAgo(share.lastSentAt) : 'just now'}`)
        : (share.message ?? 'Sharing stopped.')

  return (
    <Card className="mt-3">
      <div className="flex items-start gap-3">
        <span
          className={
            active
              ? 'flex size-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success'
              : 'flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary'
          }
        >
          <Navigation className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Live location</p>
          <p
            className={
              share.status === 'error' && mine ? 'text-sm text-[#f87171]' : 'text-sm text-muted'
            }
            aria-live="polite"
          >
            {status}
          </p>
        </div>
      </div>
      <Button
        className="mt-3"
        size="md"
        block
        variant={active ? 'secondary' : 'primary'}
        onClick={() => (active ? stopLiveShare() : void startLiveShare(bookingId))}
      >
        {active ? 'Stop Sharing' : 'Share Live Location'}
      </Button>
    </Card>
  )
}
