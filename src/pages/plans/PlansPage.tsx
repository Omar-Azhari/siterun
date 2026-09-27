import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Box, Boxes, Building2, Info } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import {
  Badge,
  Button,
  Card,
  InfoNote,
  ListSkeleton,
  ScreenTitle,
  SegmentedTabs,
  SelectableCard,
  useToast,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatDate, formatMoney } from '@/lib/format'
import { isNative } from '@/native/platform'
import { useApiMutation, usePaymentMethods, useSubscription } from '@/data/hooks'
import type { BillingPeriod, PlanId } from '@/data/types'

const PLANS: {
  id: PlanId
  name: string
  monthly: number | null
  sites: string
  features: string
  icon: React.ReactNode
  popular?: boolean
}[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthly: 9900,
    sites: 'Up to 3 sites',
    features: 'Basic features',
    icon: <Box className="size-8" strokeWidth={1.4} />,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 24900,
    sites: 'Up to 10 sites',
    features: 'Advanced features',
    icon: <Boxes className="size-8" strokeWidth={1.4} />,
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthly: null,
    sites: 'Unlimited sites',
    features: 'Dedicated support',
    icon: <Building2 className="size-8" strokeWidth={1.4} />,
  },
]

const PACKS = [
  { price: 50000, bonus: 50 },
  { price: 100000, bonus: 120 },
  { price: 250000, bonus: 350 },
]

/**
 * Inside the apps, plans and SiteCredits are shown but not sold. Buying a subscription
 * inside an app is what Apple and Google require their own billing for; hiring a machine
 * is a physical service, which they leave alone. See STORE.md.
 */
function PlanSummary() {
  const sub = useSubscription()
  const s = sub.data
  return (
    <AppScreen>
      <ScreenTitle title="Your Plan" subtitle="Plans and SiteCredits for your organisation." />
      {sub.isPending ? (
        <ListSkeleton rows={2} thumb={false} />
      ) : (
        <Card className="space-y-2 text-sm">
          <p className="flex justify-between gap-3">
            <span className="text-muted">Plan</span>
            <span className="font-semibold capitalize">{s?.plan ?? 'Starter'}</span>
          </p>
          <p className="flex justify-between gap-3">
            <span className="text-muted">Billing</span>
            <span className="capitalize">{s?.period ?? 'monthly'}</span>
          </p>
          {s?.renewsAt && (
            <p className="flex justify-between gap-3">
              <span className="text-muted">Renews</span>
              <span>{formatDate(s.renewsAt)}</span>
            </p>
          )}
          <p className="flex justify-between gap-3">
            <span className="text-muted">SiteCredits</span>
            <span className="font-semibold">
              {(s?.creditsBalance ?? 0).toLocaleString('en-AU')}
            </span>
          </p>
        </Card>
      )}
      <InfoNote className="mt-3">
        Changing a plan or buying SiteCredits is done on the SiteRun website, not in the app.
        Everything else — hiring, deliveries and invoices — works here as usual.
      </InfoNote>
    </AppScreen>
  )
}

/** Board 02 · Choose Plan & SiteCredits */
export function PlansPage() {
  // The apps show the plan; they don't sell it.
  if (isNative()) return <PlanSummary />
  return <PlanPicker />
}

function PlanPicker() {
  const [params] = useSearchParams()
  const onboarding = params.get('onboarding') === '1'
  const navigate = useNavigate()
  const toast = useToast()
  const sub = useSubscription()
  const cards = usePaymentMethods()
  const [period, setPeriod] = useState<BillingPeriod>('monthly')
  const [plan, setPlan] = useState<PlanId>('pro')
  const [pack, setPack] = useState<number | null>(100000)
  const [showCredits, setShowCredits] = useState(false)
  const subscribe = useApiMutation(
    (api, v: { plan: PlanId; period: BillingPeriod; pack: number | null }) =>
      api.subscribe(v.plan, v.period, v.pack),
    {
      success: 'Plan updated',
    },
  )
  const enterprise = useApiMutation(
    (api) =>
      api.createTicket({
        subject: 'Enterprise plan enquiry',
        category: 'Billing',
        description: 'Please contact me about Enterprise pricing.',
      }),
    { success: 'Thanks! Our team will be in touch within 1 business day.' },
  )

  const price = (monthly: number) => (period === 'annual' ? Math.round(monthly * 0.8) : monthly)

  const onContinue = () => {
    if (plan === 'enterprise') {
      enterprise.mutate(undefined, { onSuccess: () => navigate('/sites') })
      return
    }
    if (!cards.data?.length) {
      toast.info('Add a card first', 'You’ll come back here after saving it.')
      navigate(
        `/payments/cards/new?next=${encodeURIComponent('/plans' + (onboarding ? '?onboarding=1' : ''))}`,
      )
      return
    }
    subscribe.mutate({ plan, period, pack }, { onSuccess: () => navigate('/sites') })
  }

  return (
    <AppScreen
      hideNav={onboarding}
      footer={
        <Button
          arrow
          onClick={onContinue}
          loading={subscribe.isPending || enterprise.isPending}
          disabled={sub.isPending}
        >
          {plan === 'enterprise' ? 'Contact Sales' : 'Continue'}
        </Button>
      }
    >
      <ScreenTitle
        title="Choose Plan & SiteCredits"
        subtitle="Select a plan that fits your business and add credits to start hiring."
      />
      {sub.data?.status === 'active' && (
        <p className="mb-3 rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-muted">
          Current plan: <span className="font-semibold text-fg capitalize">{sub.data.plan}</span> (
          {sub.data.period}) · {sub.data.creditsBalance.toLocaleString('en-AU')} SiteCredits
        </p>
      )}
      <SegmentedTabs
        variant="joined"
        label="Billing period"
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'monthly', label: 'Monthly' },
          { value: 'annual', label: 'Annual', badge: <Badge tone="success">Save 20%</Badge> },
        ]}
      />
      <div role="radiogroup" aria-label="Plan" className="mt-3 space-y-2.5">
        {PLANS.map((p) => (
          <SelectableCard
            key={p.id}
            selected={plan === p.id}
            onSelect={() => setPlan(p.id)}
            indicator={plan === p.id ? 'check' : 'radio'}
            indicatorPosition="top-right"
            icon={<span className="text-[#dae4ef]">{p.icon}</span>}
            label={`${p.name}${p.popular ? ', Most Popular' : ''}`}
            title={
              <span className="flex items-center gap-2 pr-8">
                {p.name}
                {p.popular && <Badge className="ml-auto">Most Popular</Badge>}
              </span>
            }
            className="items-start py-3"
          >
            <span className="mt-0.5 block text-lg font-bold">
              {p.monthly === null ? (
                'Custom pricing'
              ) : (
                <>
                  {formatMoney(price(p.monthly))}{' '}
                  <span className="text-[13px] font-normal text-muted">/ month</span>
                </>
              )}
            </span>
            <span className="mt-0.5 block text-[13px] text-[#dae4ef]">{p.sites}</span>
            <span className="block text-[13px] text-[#dae4ef]">{p.features}</span>
            {period === 'annual' && p.monthly !== null && (
              <span className="mt-0.5 block text-xs text-muted">
                Billed {formatMoney(price(p.monthly) * 12)} yearly
              </span>
            )}
          </SelectableCard>
        ))}
      </div>

      <div className="mt-5 mb-2 flex items-center gap-1.5">
        <h2 className="text-sm font-semibold">Add SiteCredits (Optional)</h2>
        <button
          type="button"
          aria-label="What are SiteCredits?"
          aria-expanded={showCredits}
          onClick={() => setShowCredits((s) => !s)}
          className="-m-2 p-2 text-[#dae4ef]"
        >
          <Info className="size-4" />
        </button>
      </div>
      {showCredits && (
        <p className="mb-2 text-xs text-muted">
          SiteCredits are prepaid hire credit ($1 = 1 credit). Larger packs include bonus credits
          and are used before your card.
        </p>
      )}
      <div role="radiogroup" aria-label="SiteCredits pack" className="grid grid-cols-3 gap-2">
        {PACKS.map((k) => {
          const on = pack === k.price
          return (
            <button
              key={k.price}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPack(on ? null : k.price)}
              className={cn(
                'rounded-[10px] border py-2 text-center transition-colors',
                on
                  ? 'border-primary bg-primary text-white'
                  : 'border-line bg-card hover:border-line-input',
              )}
            >
              <span className="block text-[15px] font-semibold">{formatMoney(k.price)}</span>
              <span className={cn('block text-[11px]', on ? 'text-white' : 'text-muted')}>
                + {k.bonus} credits
              </span>
            </button>
          )
        })}
      </div>
    </AppScreen>
  )
}
