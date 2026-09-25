import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BadgeCheck, Landmark } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { getApi } from '@/data/client'
import { useApiMutation, usePayoutAccount } from '@/data/hooks'

/**
 * Connecting a supplier to Stripe so payouts reach their bank. Stripe collects the
 * business and bank details on its own pages; SiteRun only learns whether the account can
 * be paid. Nothing shows here until real payments are switched on.
 */
export function PayoutSetupCard() {
  const account = usePayoutAccount(getApi().payments === 'stripe')
  const [params, setParams] = useSearchParams()
  const start = useApiMutation((api) => api.startPayoutSetup('/supplier/payouts?stripe=done'), {
    silent: true,
  })
  const refetch = account.refetch

  // Stripe sends the supplier back here when they finish (or give up).
  useEffect(() => {
    if (!params.get('stripe')) return
    void getApi()
      .refreshPayoutAccount()
      .catch(() => {})
      .finally(() => {
        params.delete('stripe')
        setParams(params, { replace: true })
        void refetch()
      })
    // Runs once for the round trip back from Stripe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const a = account.data
  if (!a || a.provider !== 'stripe' || a.payoutsEnabled) return null

  const open = () =>
    start.mutate(undefined, {
      onSuccess: ({ url }) => {
        window.location.href = url
      },
    })

  return (
    <Card className="mt-2.5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          {a.detailsSubmitted ? (
            <BadgeCheck className="size-5" aria-hidden />
          ) : (
            <Landmark className="size-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {a.detailsSubmitted ? 'Stripe is checking your details' : 'Set up payouts'}
          </p>
          <p className="text-sm text-muted">
            {a.detailsSubmitted
              ? 'Stripe is reviewing what you sent. Payouts open as soon as that’s done.'
              : 'Add your business and bank details with Stripe so SiteRun can pay you. It takes about five minutes.'}
          </p>
        </div>
      </div>
      {a.isOwner ? (
        <Button
          className="mt-3"
          size="md"
          block
          variant={a.detailsSubmitted ? 'secondary' : 'primary'}
          loading={start.isPending || account.isFetching}
          onClick={open}
        >
          {a.detailsSubmitted
            ? 'Check again'
            : a.connected
              ? 'Finish setting up'
              : 'Set Up Payouts'}
        </Button>
      ) : (
        <p className="mt-3 text-sm text-muted">Only the organisation owner can set this up.</p>
      )}
      {start.isError && (
        <p role="alert" className="mt-2 text-xs text-[#f87171]">
          {start.error instanceof Error ? start.error.message : 'Couldn’t open Stripe.'}
        </p>
      )}
    </Card>
  )
}
