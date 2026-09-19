import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  BookOpen,
  ChevronDown,
  ClipboardList,
  LifeBuoy,
  MessagesSquare,
  Phone,
  Send,
} from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AppScreen } from '@/components/layout/AppScreen'
import {
  BottomSheet,
  Button,
  Card,
  EmptyState,
  Input,
  ListRow,
  ListSkeleton,
  ScreenTitle,
  SearchInput,
  SectionLabel,
  Select,
  StatusPill,
  Textarea,
} from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { useApiMutation, useTickets } from '@/data/hooks'
import { ARTICLES } from './articles'

const SUPPORT_PHONE = '1300 747 873'

/** Board 10 · Support */
export function SupportPage() {
  const navigate = useNavigate()
  const tickets = useTickets()
  const [q, setQ] = useState('')
  const [chat, setChat] = useState(false)
  const [chatText, setChatText] = useState('')
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t
      ? ARTICLES.filter((a) => `${a.title} ${a.body}`.toLowerCase().includes(t)).slice(0, 4)
      : []
  }, [q])
  const startChat = useApiMutation(
    (api, text: string) =>
      api.createTicket({ subject: 'Live chat', category: 'Chat', description: text }),
    {
      success: 'Thanks! A support agent will reply shortly.',
    },
  )
  const recent = (tickets.data ?? []).slice(0, 3)

  const rows = [
    {
      icon: LifeBuoy,
      title: 'Report an Issue',
      subtitle: 'Equipment, bookings or payments',
      to: '/support/new?category=Issue',
    },
    {
      icon: MessagesSquare,
      title: 'Live Chat',
      subtitle: 'Chat with our support team',
      onClick: () => setChat(true),
    },
    {
      icon: Phone,
      title: 'Call Support',
      subtitle: `${SUPPORT_PHONE}\nMon – Fri, 8am – 6pm AEST`,
      href: `tel:${SUPPORT_PHONE.replace(/\s/g, '')}`,
    },
    {
      icon: BookOpen,
      title: 'Help Articles',
      subtitle: 'Browse guides and FAQs',
      to: '/support/articles',
    },
    {
      icon: ClipboardList,
      title: 'Submit a Request',
      subtitle: 'Log a support ticket',
      to: '/support/new',
    },
  ]

  return (
    <AppScreen root>
      <ScreenTitle
        title="Support"
        subtitle="Get help, resolve issues and contact the SiteRun team."
      />
      <SearchInput
        placeholder="Search help articles..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onClear={() => setQ('')}
      />
      {q && (
        <Card className="-mt-1 mb-3 divide-y divide-line py-0">
          {matches.length === 0 && (
            <p className="py-3 text-sm text-muted">
              No articles found. Try “invoice” or “delivery”.
            </p>
          )}
          {matches.map((a) => (
            <Link
              key={a.id}
              to={`/support/articles#${a.id}`}
              className="block py-3 text-sm hover:text-primary"
            >
              {a.title}
            </Link>
          ))}
        </Card>
      )}
      <div className="space-y-2">
        {rows.map((r) => {
          const lead = <r.icon className="size-7 text-primary" strokeWidth={1.5} aria-hidden />
          const sub = <span className="whitespace-pre-line">{r.subtitle}</span>
          if ('href' in r && r.href)
            return (
              <a
                key={r.title}
                href={r.href}
                className={cn(cardClass, 'flex items-center gap-3 p-3 hover:border-line-input')}
              >
                {lead}
                <span className="flex-1">
                  <span className="block text-base font-semibold">{r.title}</span>
                  <span className="block text-sm text-muted">{sub}</span>
                </span>
              </a>
            )
          return (
            <ListRow
              key={r.title}
              to={'to' in r ? r.to : undefined}
              onClick={'onClick' in r ? r.onClick : undefined}
              leading={lead}
              title={r.title}
              subtitle={sub}
            />
          )
        })}
      </div>

      <SectionLabel action={<Link to="/support/requests">View all ›</Link>}>
        Recent Requests
      </SectionLabel>
      {tickets.isPending && <ListSkeleton rows={2} thumb={false} />}
      {tickets.data?.length === 0 && <p className="text-sm text-muted">No requests yet.</p>}
      <div className="space-y-2">
        {recent.map((t) => (
          <Card key={t.id} className="flex items-center justify-between py-3">
            <span>
              <span className="block text-sm font-semibold">{t.ref}</span>
              <span className="block text-sm text-muted">{t.subject}</span>
            </span>
            <StatusPill status={t.status} />
          </Card>
        ))}
      </div>

      <BottomSheet
        open={chat}
        onClose={() => setChat(false)}
        title="Live Chat"
        footer={
          <Button
            leftIcon={<Send className="size-5" />}
            disabled={chatText.trim().length < 3}
            loading={startChat.isPending}
            onClick={() =>
              startChat.mutate(chatText, {
                onSuccess: () => {
                  setChat(false)
                  setChatText('')
                  navigate('/support/requests')
                },
              })
            }
          >
            Start Chat
          </Button>
        }
      >
        <p className="mb-3 text-sm text-muted">
          Our team is online Mon – Fri, 8am – 6pm AEST. Tell us what you need and an agent will pick
          it up.
        </p>
        <Textarea
          label="How can we help?"
          rows={4}
          maxLength={1000}
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
        />
      </BottomSheet>
    </AppScreen>
  )
}

export function TicketsPage() {
  const tickets = useTickets()
  return (
    <AppScreen>
      <ScreenTitle title="Your Requests" subtitle="Support tickets for your organisation." />
      {tickets.isPending && <ListSkeleton rows={3} thumb={false} />}
      {tickets.data?.length === 0 && <EmptyState title="No requests yet" />}
      <div className="space-y-2">
        {tickets.data?.map((t) => (
          <Card key={t.id} className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">
                {t.ref} · {t.category}
              </span>
              <StatusPill status={t.status} />
            </div>
            <p className="mt-1 font-medium">{t.subject}</p>
            {t.description && <p className="text-sm text-muted">{t.description}</p>}
            <p className="mt-1 text-xs text-subtle">
              Opened {format(parseISO(t.createdAt), 'd MMM yyyy, h:mm a')}
            </p>
          </Card>
        ))}
      </div>
    </AppScreen>
  )
}

export function HelpArticlesPage() {
  const { hash } = useLocation()
  const [q, setQ] = useState('')
  const list = ARTICLES.filter((a) =>
    `${a.title} ${a.body}`.toLowerCase().includes(q.trim().toLowerCase()),
  )
  const groups = [...new Set(list.map((a) => a.topic))]
  return (
    <AppScreen>
      <ScreenTitle title="Help Articles" subtitle="Guides and answers to common questions." />
      <SearchInput
        placeholder="Search help articles..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onClear={() => setQ('')}
      />
      {groups.map((g) => (
        <section key={g}>
          <SectionLabel>{g}</SectionLabel>
          <div className="space-y-2">
            {list
              .filter((a) => a.topic === g)
              .map((a) => (
                <details
                  key={a.id}
                  id={a.id}
                  className={cn(cardClass, 'group p-0')}
                  open={hash === `#${a.id}` || undefined}
                >
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-3 text-[15px] font-medium">
                    <span className="flex-1">{a.title}</span>
                    <ChevronDown
                      className="size-4 transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <p className="px-3 pb-3 text-sm leading-relaxed text-muted">{a.body}</p>
                </details>
              ))}
          </div>
        </section>
      ))}
      {list.length === 0 && (
        <EmptyState
          title="No articles found"
          action={
            <Link to="/support/new" className="text-primary">
              Ask our team instead
            </Link>
          }
        />
      )}
    </AppScreen>
  )
}

const ticketSchema = z.object({
  category: z.string().min(1),
  subject: z.string().trim().min(3, 'Add a short subject'),
  description: z.string().trim().min(10, 'Tell us a bit more (10+ characters)').max(2000),
})

export function NewTicketPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const form = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { category: params.get('category') ?? 'Bookings', subject: '', description: '' },
  })
  const create = useApiMutation((api, v: z.infer<typeof ticketSchema>) => api.createTicket(v), {
    success: (t) => `Request ${t.ref} submitted`,
  })
  const e = form.formState.errors
  return (
    <AppScreen
      hideNav
      footer={
        <Button
          arrow
          loading={create.isPending}
          onClick={form.handleSubmit((v) =>
            create.mutate(v, { onSuccess: () => navigate('/support/requests', { replace: true }) }),
          )}
        >
          Submit Request
        </Button>
      }
    >
      <ScreenTitle title="Submit a Request" subtitle="We usually reply within 1 business day." />
      <Select
        label="Category"
        options={[
          'Bookings',
          'Payments',
          'Equipment',
          'Compliance',
          'Account',
          'Issue',
          'Other',
        ].map((c) => ({ value: c, label: c === 'Issue' ? 'Report an issue' : c }))}
        {...form.register('category')}
      />
      <Input label="Subject" error={e.subject?.message} {...form.register('subject')} />
      <Textarea
        label="Details"
        rows={6}
        maxLength={2000}
        error={e.description?.message}
        {...form.register('description')}
      />
    </AppScreen>
  )
}
