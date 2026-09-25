import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronRight, Info, Wallet } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListSkeleton,
  ScreenTitle,
  SectionLabel,
  Skeleton,
  StatTile,
  StatusPill,
} from '@/components/ui'
import { formatMoney } from '@/lib/format'
import { useApiMutation, useMe, usePayoutAccount, usePayoutSummary, usePayouts } from '@/data/hooks'
import { getApi } from '@/data/client'
import { PayoutSetupCard } from './PayoutSetupCard'

/** Board 09 · Payouts */
export function PayoutsPage() {
  const { data: me } = useMe()
  const summary = usePayoutSummary()
  const payouts = usePayouts()
  const [info, setInfo] = useState(false)
  const [all, setAll] = useState(false)
  const request = useApiMutation((api) => api.requestPayout(), {
    success: (p) => `Payout of ${formatMoney(p.amountCents, { cents: true })} requested`,
  })
  const stripe = getApi().payments === 'stripe'
  const account = usePayoutAccount(stripe)
  const s = summary.data
  const list = payouts.data ?? []
  const shown = all ? list : list.slice(0, 4)
  // With Stripe on, the money can only move once the supplier's account is ready.
  const ready = !stripe || !!account.data?.payoutsEnabled
  const canRequest = me?.role === 'owner' && !!s?.availableCents && ready

  return (
    <AppScreen root>
      <ScreenTitle title="Payouts" subtitle="Track your earnings and request a payout." />
      {summary.isError && <ErrorState onRetry={() => void summary.refetch()} />}
      <Card className="py-4">
        <p className="flex items-center gap-1.5 text-[15px] text-[#dae4ef]">
          Available for Payout
          <button
            type="button"
            aria-label="About available balance"
            aria-expanded={info}
            onClick={() => setInfo((v) => !v)}
            className="-m-2 p-2"
          >
            <Info className="size-4" />
          </button>
        </p>
        {info && (
          <p className="mt-1 text-xs text-muted">
            Completed hires less SiteRun’s 10% service fee and payouts already requested.
          </p>
        )}
        {s ? (
          <p className="font-display text-[34px] font-bold">
            {formatMoney(s.availableCents, { cents: true })}
          </p>
        ) : (
          <Skeleton className="mt-1 h-10 w-44" />
        )}
        <Button
          arrow
          className="mt-3"
          disabled={!canRequest}
          loading={request.isPending}
          onClick={() => request.mutate(undefined)}
        >
          {me?.role !== 'owner'
            ? 'Only the owner can request payouts'
            : !ready
              ? 'Set up payouts first'
              : 'Request Payout'}
        </Button>
      </Card>
      <PayoutSetupCard />
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        {s ? (
          <>
            <StatTile
              layout="stack"
              label="Total Revenue"
              value={formatMoney(s.totalRevenueCents)}
              trend={s.revenueTrend}
            />
            <StatTile
              layout="stack"
              label="Completed Hires"
              value={String(s.completedHires)}
              trend={s.completedTrend}
            />
          </>
        ) : (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        )}
      </div>
      <p className="mt-1 text-right text-xs text-muted">Last 30 days vs previous 30</p>
      <SectionLabel
        action={
          list.length > 4 ? (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="flex min-h-11 items-center gap-0.5"
            >
              {all ? 'Show less' : 'View all'} <ChevronRight className="size-4" aria-hidden />
            </button>
          ) : undefined
        }
      >
        Recent Payouts
      </SectionLabel>
      {payouts.isPending && <ListSkeleton rows={3} thumb={false} />}
      {payouts.data && list.length === 0 && (
        <EmptyState icon={<Wallet strokeWidth={1.75} />} title="No payouts yet" />
      )}
      {list.length > 0 && (
        <Card className="divide-y divide-line py-0">
          {shown.map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-3 text-[15px]">
              <span className="w-28 text-[#dae4ef]">
                {format(parseISO(p.paidAt ?? p.requestedAt), 'd MMM yyyy')}
              </span>
              <span className="flex-1 font-semibold">
                {formatMoney(p.amountCents, { cents: true })}
              </span>
              <StatusPill
                {...(p.status === 'paid'
                  ? { status: 'paid' as const }
                  : { label: 'Processing', tone: 'warning' as const, mark: 'dot' as const })}
              />
            </div>
          ))}
        </Card>
      )}
    </AppScreen>
  )
}
