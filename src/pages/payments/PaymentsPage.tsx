import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Info, Landmark, Plus } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import {
  BottomSheet,
  Button,
  Card,
  CopyButton,
  ErrorState,
  Input,
  ListSkeleton,
  OrDivider,
  ScreenTitle,
  SectionLabel,
  SelectableCard,
  Skeleton,
} from '@/components/ui'
import { BrandMark } from '@/components/domain/BrandMark'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { useApiMutation, useBalance, useMe, usePaymentMethods } from '@/data/hooks'
import type { PaymentMethod } from '@/data/types'

const BANK = { name: 'SiteRun Pty Ltd', bsb: '062 001', account: '1234 5678' }

const expiry = (m: PaymentMethod) =>
  `${String(m.expMonth).padStart(2, '0')}/${String(m.expYear).slice(-2)}`

/** Board 05 · Payments */
export function PaymentsPage() {
  const { data: me } = useMe()
  const balance = useBalance()
  const methods = usePaymentMethods()
  const [payOpen, setPayOpen] = useState(false)
  const [info, setInfo] = useState(false)
  const [amount, setAmount] = useState('')
  const [methodId, setMethodId] = useState<string | null>(null)
  const [manage, setManage] = useState<PaymentMethod | null>(null)
  const pay = useApiMutation(
    (api, v: { cents: number; methodId: string }) => api.makePayment(v.cents, v.methodId),
    { success: 'Payment received. Thank you!' },
  )
  const remove = useApiMutation((api, id: string) => api.removePaymentMethod(id), {
    success: 'Card removed',
  })

  const selected =
    methodId ?? methods.data?.find((m) => m.isDefault)?.id ?? methods.data?.[0]?.id ?? null
  const cents = Math.round(Number(amount.replace(/[^\d.]/g, '')) * 100)
  const amountError =
    amount && (!cents || cents <= 0)
      ? 'Enter an amount'
      : balance.data !== undefined && cents > balance.data
        ? 'That’s more than your balance'
        : undefined

  return (
    <AppScreen root>
      <ScreenTitle title="Payments" subtitle="Manage payment methods and view your balance." />
      <Card className="py-4">
        <p className="flex items-center gap-1.5 text-[15px] text-[#dae4ef]">
          Account Balance
          <button
            type="button"
            aria-label="About your balance"
            aria-expanded={info}
            onClick={() => setInfo((v) => !v)}
            className="-m-2 p-2"
          >
            <Info className="size-4" />
          </button>
        </p>
        {info && (
          <p className="mt-1 text-xs text-muted">
            Unpaid invoices including GST for {me?.org?.name}.
          </p>
        )}
        {balance.isPending ? (
          <Skeleton className="mt-1 h-10 w-44" />
        ) : (
          <p className="font-display text-[34px] font-bold">
            {formatMoney(balance.data ?? 0, { cents: true })}
          </p>
        )}
        <Button
          arrow
          className="mt-3"
          disabled={!balance.data}
          onClick={() => {
            setAmount(((balance.data ?? 0) / 100).toFixed(2))
            setPayOpen(true)
          }}
        >
          {balance.data ? 'Make a Payment' : 'Nothing to pay'}
        </Button>
      </Card>

      <SectionLabel>Saved Payment Methods</SectionLabel>
      <div className="space-y-2">
        {methods.isPending && <ListSkeleton rows={2} thumb={false} />}
        {methods.isError && <ErrorState onRetry={() => void methods.refetch()} />}
        {methods.data?.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setManage(m)}
            className={cn(
              cardClass,
              'flex w-full items-center gap-3 p-3 text-left hover:border-line-input',
            )}
          >
            <BrandMark brand={m.brand} />
            <span className="flex-1">
              <span className="block text-base font-semibold tracking-wide">
                <span aria-hidden>•••• </span>
                <span className="sr-only">{m.brand} ending in </span>
                {m.last4}
                {m.isDefault && (
                  <span className="ml-2 text-xs font-normal text-primary">Default</span>
                )}
              </span>
              <span className="block text-sm text-muted">Expires {expiry(m)}</span>
            </span>
            <ChevronRight className="size-5 text-muted" aria-hidden />
          </button>
        ))}
        <Link
          to="/payments/cards/new"
          className={cn(cardClass, 'flex items-center gap-3 p-3 hover:border-line-input')}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-primary">
            <Plus className="size-5" aria-hidden />
          </span>
          <span className="flex-1 text-base font-medium">Add Card</span>
          <ChevronRight className="size-5 text-muted" aria-hidden />
        </Link>
      </div>

      <OrDivider />
      <Card className="flex items-start gap-3">
        <Landmark className="size-8 shrink-0 text-[#dae4ef]" strokeWidth={1.4} aria-hidden />
        <div className="flex-1 text-sm">
          <p className="text-base font-semibold">Bank Transfer</p>
          <p className="text-[#dae4ef]">BSB {BANK.bsb}</p>
          <p className="text-[#dae4ef]">Account {BANK.account}</p>
          <p className="text-[#dae4ef]">{BANK.name}</p>
          <p className="mt-1 text-xs text-muted">Use your invoice number as the reference.</p>
        </div>
        <CopyButton
          value={`${BANK.name}\nBSB ${BANK.bsb}\nAccount ${BANK.account}`}
          label="Copy bank details"
        />
      </Card>

      <BottomSheet
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Make a Payment"
        footer={
          <Button
            arrow
            disabled={!selected || !!amountError || !cents}
            loading={pay.isPending}
            onClick={() =>
              selected &&
              pay.mutate({ cents, methodId: selected }, { onSuccess: () => setPayOpen(false) })
            }
          >
            Pay {cents > 0 ? formatMoney(cents, { cents: true }) : ''}
          </Button>
        }
      >
        <Input
          label="Amount (AUD)"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          leftIcon={<span className="text-fg">$</span>}
          error={amountError}
          hint="Payments are applied to your oldest invoices first."
        />
        <p className="mb-2 text-sm">Pay with</p>
        <div role="radiogroup" aria-label="Payment method" className="space-y-2">
          {methods.data?.map((m) => (
            <SelectableCard
              key={m.id}
              selected={selected === m.id}
              onSelect={() => setMethodId(m.id)}
              icon={<BrandMark brand={m.brand} className="h-8 w-11" />}
              title={`•••• ${m.last4}`}
              description={`Expires ${expiry(m)}`}
              label={`${m.brand} ending ${m.last4}`}
            />
          ))}
          {methods.data?.length === 0 && <p className="text-sm text-muted">Add a card first.</p>}
        </div>
        <p className="mt-3 text-xs text-muted">Demo payments: no real card is charged.</p>
      </BottomSheet>

      <BottomSheet
        open={!!manage}
        onClose={() => setManage(null)}
        title={manage ? `Card ending ${manage.last4}` : ''}
      >
        {manage && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <BrandMark brand={manage.brand} />
              <p className="text-sm text-muted">
                Expires {expiry(manage)}
                {manage.isDefault ? ' · Default card' : ''}
              </p>
            </div>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() => remove.mutate(manage.id, { onSuccess: () => setManage(null) })}
            >
              Remove Card
            </Button>
          </div>
        )}
      </BottomSheet>
    </AppScreen>
  )
}
