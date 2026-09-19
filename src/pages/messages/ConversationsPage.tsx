import { shortTime } from '@/lib/format'
import { MessageSquareText, Truck } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { EmptyState, ErrorState, ListRow, ListSkeleton, ScreenTitle } from '@/components/ui'
import { useConversations } from '@/data/hooks'

/** Conversation list (the designs show one open thread; this is its index). */
export function ConversationsPage() {
  const convs = useConversations()
  return (
    <AppScreen root>
      <ScreenTitle
        title="Messages"
        subtitle="Chat with suppliers about your bookings, delivery and site details."
      />
      <div className="space-y-2.5">
        {convs.isPending && <ListSkeleton rows={3} thumb={false} />}
        {convs.isError && <ErrorState onRetry={() => void convs.refetch()} />}
        {convs.data?.length === 0 && (
          <EmptyState
            icon={<MessageSquareText strokeWidth={1.75} />}
            title="No messages yet"
            description="Conversations start when you send a booking request."
          />
        )}
        {convs.data?.map((c) => (
          <ListRow
            key={c.id}
            to={`/messages/${c.id}`}
            leading={
              <span className="relative flex size-12 items-center justify-center rounded-full bg-primary">
                <Truck className="size-6" aria-hidden />
                {c.online && (
                  <span
                    className="absolute right-0 bottom-0 size-3 rounded-full bg-success ring-2 ring-card"
                    aria-label="Online"
                  />
                )}
              </span>
            }
            title={
              <span className="flex items-center justify-between gap-2">
                <span className="truncate">{c.title}</span>
                <span className="shrink-0 text-xs font-normal text-muted">
                  {shortTime(c.lastMessageAt)}
                </span>
              </span>
            }
            subtitle={<span className="block truncate text-xs">{c.subtitle}</span>}
            meta={
              <span className="flex items-center justify-between gap-2">
                <span className={c.unreadCount ? 'truncate font-medium text-fg' : 'truncate'}>
                  {c.lastMessage}
                </span>
                {c.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
                    {c.unreadCount}
                    <span className="sr-only"> unread</span>
                  </span>
                )}
              </span>
            }
          />
        ))}
      </div>
    </AppScreen>
  )
}
