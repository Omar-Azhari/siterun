import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellOff, CalendarCheck, ChevronRight, FileText, MessageSquareText, ShieldCheck, TriangleAlert, Truck } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { Button, EmptyState, ErrorState, ListSkeleton, ScreenTitle, SegmentedTabs } from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import { getApi } from '@/data/client'
import { useApiMutation, useNotifications } from '@/data/hooks'
import type { AppNotification } from '@/data/types'

type Tab = 'all' | 'bookings' | 'docs'

function Icon({ n }: { n: AppNotification }) {
  const cls = 'size-8 shrink-0'
  switch (n.type) {
    case 'booking':
      return <CalendarCheck className={cn(cls, 'text-primary')} strokeWidth={1.5} aria-hidden />
    case 'delivery':
      return <Truck className={cn(cls, 'text-primary')} strokeWidth={1.5} aria-hidden />
    case 'invoice':
      return <FileText className={cn(cls, 'text-primary')} strokeWidth={1.5} aria-hidden />
    case 'document':
      return /expir|reject/i.test(n.title) ? (
        <TriangleAlert className={cn(cls, 'text-danger')} strokeWidth={1.5} aria-hidden />
      ) : (
        <ShieldCheck className={cn(cls, 'text-primary')} strokeWidth={1.5} aria-hidden />
      )
    case 'message':
      return <MessageSquareText className={cn(cls, 'text-primary')} strokeWidth={1.5} aria-hidden />
    case 'listing':
      return <ShieldCheck className={cn(cls, 'text-success')} strokeWidth={1.5} aria-hidden />
  }
}

/** Board 05 · Notifications */
export function NotificationsPage() {
  const navigate = useNavigate()
  const notes = useNotifications()
  const [tab, setTab] = useState<Tab>('all')
  const markAll = useApiMutation((api) => api.markAllNotificationsRead(), { success: 'All caught up' })
  const all = notes.data ?? []
  const bookings = all.filter((n) => n.type === 'booking' || n.type === 'delivery')
  const docs = all.filter((n) => n.type === 'document' || n.type === 'listing')
  const list = tab === 'all' ? all : tab === 'bookings' ? bookings : docs
  const unread = all.filter((n) => !n.read).length

  const open = (n: AppNotification) => {
    void getApi().markNotificationRead(n.id)
    if (n.link) navigate(n.link)
  }

  return (
    <AppScreen
      footer={
        <Button arrow disabled={!unread} loading={markAll.isPending} onClick={() => markAll.mutate(undefined)}>
          {unread ? 'Mark All as Read' : 'All caught up'}
        </Button>
      }
    >
      <ScreenTitle title="Notifications" subtitle="Stay up to date with your bookings, documents and more." />
      <SegmentedTabs
        label="Notification type"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'all', label: 'All', count: all.length },
          { value: 'bookings', label: 'Bookings', count: bookings.length },
          { value: 'docs', label: 'Docs', count: docs.length },
        ]}
      />
      <ul className="mt-3 space-y-2" role="tabpanel">
        {notes.isPending && <ListSkeleton rows={4} thumb={false} />}
        {notes.isError && <ErrorState onRetry={() => void notes.refetch()} />}
        {notes.data && list.length === 0 && <EmptyState icon={<BellOff strokeWidth={1.75} />} title="No notifications" description="You’re all caught up." />}
        {list.map((n) => (
          <li key={n.id}>
            <button type="button" onClick={() => open(n)} className={cn(cardClass, 'flex w-full items-start gap-3 p-3 text-left hover:border-line-input', !n.read && 'border-line-input')}>
              <Icon n={n} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-2 text-base font-semibold">
                    {!n.read && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                    {n.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(n.createdAt)}</span>
                </span>
                <span className="block text-sm text-[#dae4ef]">{n.body}</span>
                {n.detail && <span className={cn('block text-sm', /expires in/i.test(n.detail) ? 'text-[#f87171]' : 'text-muted')}>{n.detail}</span>}
              </span>
              {n.link && <ChevronRight className="size-5 self-center text-muted" aria-hidden />}
            </button>
          </li>
        ))}
      </ul>
    </AppScreen>
  )
}
