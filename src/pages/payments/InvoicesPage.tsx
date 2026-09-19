import { useMemo, useState } from 'react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { ChevronRight, Download, FileText } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import {
  BottomSheet,
  Button,
  EmptyState,
  ErrorState,
  ListSkeleton,
  ScreenTitle,
  SegmentedTabs,
  StatusPill,
  useToast,
} from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { formatDate, formatMoney } from '@/lib/format'
import { downloadInvoicePdf, downloadStatementPdf } from '@/lib/pdf/download'
import { useInvoices, useMe } from '@/data/hooks'
import type { Invoice } from '@/data/types'

function dueLabel(i: Invoice) {
  if (i.status === 'paid') return { status: 'paid' as const }
  const days = differenceInCalendarDays(parseISO(i.dueDate), new Date())
  if (days < 0) return { label: `Overdue ${-days} days`, tone: 'danger' as const }
  if (days === 0) return { label: 'Due today', tone: 'warning' as const }
  return { label: `Due in ${days} day${days === 1 ? '' : 's'}`, tone: 'neutral' as const }
}

const total = (i: Invoice) => i.amountCents + i.gstCents

/** Board 05 · Invoices & Statements */
export function InvoicesPage() {
  const { data: me } = useMe()
  const invoices = useInvoices()
  const toast = useToast()
  const [tab, setTab] = useState<'invoices' | 'statements'>('invoices')
  const [open, setOpen] = useState<Invoice | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const months = useMemo(() => {
    const map = new Map<string, Invoice[]>()
    for (const i of invoices.data ?? []) {
      const k = i.issuedAt.slice(0, 7)
      map.set(k, [...(map.get(k) ?? []), i])
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [invoices.data])

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try {
      await fn()
      toast.success('Download ready')
    } catch (e) {
      toast.error('Couldn’t create the PDF', (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const org = me?.org
  const statementNow = () => {
    if (!org) return
    const [key, list] = months[0] ?? [format(new Date(), 'yyyy-MM'), []]
    void run('statement', () =>
      downloadStatementPdf(list, org, format(parseISO(`${key}-01`), 'MMMM yyyy')),
    )
  }

  return (
    <AppScreen
      root
      footer={
        <Button
          arrow
          leftIcon={<Download className="absolute left-4 size-5" />}
          loading={busy === 'statement'}
          disabled={!org || !invoices.data}
          onClick={statementNow}
        >
          Download Statement
        </Button>
      }
    >
      <ScreenTitle
        title="Invoices & Statements"
        subtitle="View, download and track your invoices."
      />
      <SegmentedTabs
        variant="joined"
        label="Documents"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'invoices', label: 'Invoices' },
          { value: 'statements', label: 'Statements' },
        ]}
      />
      <div className="mt-3 space-y-2" role="tabpanel">
        {invoices.isPending && <ListSkeleton rows={4} thumb={false} />}
        {invoices.isError && <ErrorState onRetry={() => void invoices.refetch()} />}
        {invoices.data?.length === 0 && (
          <EmptyState
            icon={<FileText strokeWidth={1.75} />}
            title="No invoices yet"
            description="Invoices appear here after each hire."
          />
        )}
        {tab === 'invoices' &&
          invoices.data?.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => setOpen(i)}
              className={cn(
                cardClass,
                'flex w-full items-center gap-3 p-3 text-left hover:border-line-input',
              )}
            >
              <FileText
                className="size-9 shrink-0 fill-primary text-app"
                strokeWidth={1.4}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold">{i.number}</span>
                <span className="block text-sm text-muted">{formatDate(i.issuedAt)}</span>
                <span className="block text-base font-semibold">
                  {formatMoney(total(i), { cents: true })}
                </span>
              </span>
              <StatusPill {...dueLabel(i)} />
              <ChevronRight className="size-5 text-muted" aria-hidden />
            </button>
          ))}
        {tab === 'statements' &&
          org &&
          months.map(([key, list]) => {
            const label = format(parseISO(`${key}-01`), 'MMMM yyyy')
            return (
              <button
                key={key}
                type="button"
                disabled={busy === key}
                onClick={() => void run(key, () => downloadStatementPdf(list, org, label))}
                className={cn(
                  cardClass,
                  'flex w-full items-center gap-3 p-3 text-left hover:border-line-input disabled:opacity-60',
                )}
              >
                <FileText
                  className="size-9 shrink-0 fill-primary text-app"
                  strokeWidth={1.4}
                  aria-hidden
                />
                <span className="flex-1">
                  <span className="block text-base font-semibold">{label}</span>
                  <span className="block text-sm text-muted">
                    {list.length} invoice{list.length === 1 ? '' : 's'} ·{' '}
                    {formatMoney(
                      list.reduce((a, i) => a + total(i), 0),
                      { cents: true },
                    )}
                  </span>
                </span>
                <Download
                  className="size-5 text-primary"
                  aria-label={`Download ${label} statement`}
                />
              </button>
            )
          })}
      </div>

      <BottomSheet
        open={!!open}
        onClose={() => setOpen(null)}
        title={open?.number ?? ''}
        footer={
          open && org ? (
            <Button
              leftIcon={<Download className="size-5" />}
              loading={busy === open.id}
              onClick={() => void run(open.id, () => downloadInvoicePdf(open, org))}
            >
              Download PDF
            </Button>
          ) : undefined
        }
      >
        {open && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">
                Issued {formatDate(open.issuedAt)} · Due {formatDate(open.dueDate)}
              </span>
              <StatusPill {...dueLabel(open)} />
            </div>
            {open.lines.map((l, n) => (
              <div key={n} className="flex justify-between gap-4">
                <span>{l.description}</span>
                <span className="shrink-0">{formatMoney(l.amountCents, { cents: true })}</span>
              </div>
            ))}
            <div className="space-y-1 border-t border-line pt-2">
              <div className="flex justify-between text-muted">
                <span>Subtotal (ex. GST)</span>
                <span>{formatMoney(open.amountCents, { cents: true })}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>GST (10%)</span>
                <span>{formatMoney(open.gstCents, { cents: true })}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatMoney(total(open), { cents: true })}</span>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </AppScreen>
  )
}
