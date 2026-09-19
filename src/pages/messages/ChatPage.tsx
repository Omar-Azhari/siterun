import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { CheckCheck, ChevronRight, Paperclip, Send, Truck, X } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { EmptyState, ErrorState, ListSkeleton, useToast } from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { getApi } from '@/data/client'
import { useApiMutation, useConversation, useMe, useMessages } from '@/data/hooks'
import type { Message } from '@/data/types'

/** Board 05 · Messages (single conversation). Realtime via Api.subscribeMessages. */
export function ChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const { data: me } = useMe()
  const conv = useConversation(id)
  const messages = useMessages(id)
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const send = useApiMutation((api, v: { body: string; file: File | null }) =>
    api.sendMessage(id ?? '', v.body, v.file),
  )

  useEffect(() => {
    if (!id) return
    void getApi().markConversationRead(id)
    return getApi().subscribeMessages(id, (m) => {
      qc.setQueryData<Message[]>(['messages', id], (old) =>
        old?.some((x) => x.id === m.id) ? old : [...(old ?? []), m],
      )
      void getApi().markConversationRead(id)
    })
  }, [id, qc])

  useLayoutEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messages.data?.length])

  const submit = () => {
    const body = text.trim()
    if (!body && !file) return
    send.mutate(
      { body, file },
      {
        onSuccess: () => {
          setText('')
          setFile(null)
        },
      },
    )
  }

  const c = conv.data
  const mine = (m: Message) =>
    m.senderId === me?.profile.id || (!!m.senderId && m.senderName === me?.profile.fullName)

  return (
    <AppScreen
      root={false}
      footer={
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="flex items-end gap-2"
        >
          <input
            ref={fileInput}
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null
              if (f && f.size > 10 * 1024 * 1024) {
                toast.error('File too large', 'Attachments must be 10MB or smaller.')
                return
              }
              setFile(f)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            aria-label="Attach a file"
            onClick={() => fileInput.current?.click()}
            className="flex size-12 shrink-0 items-center justify-center rounded-full text-[#dae4ef] hover:bg-white/5"
          >
            <Paperclip className="size-5" />
          </button>
          <div className="flex min-h-12 flex-1 flex-col justify-center rounded-3xl border border-line-input bg-input px-4 focus-within:border-primary">
            {file && (
              <span className="mt-2 inline-flex max-w-full items-center gap-1 self-start rounded-md bg-white/10 px-2 py-0.5 text-xs">
                <Paperclip className="size-3" aria-hidden />
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  aria-label="Remove attachment"
                  onClick={() => setFile(null)}
                  className="-mr-1 p-1"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            <label htmlFor="chat-input" className="sr-only">
              Message
            </label>
            <input
              id="chat-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              autoComplete="off"
              maxLength={2000}
              className="h-11 w-full bg-transparent text-base outline-none placeholder:text-subtle"
            />
          </div>
          <button
            type="submit"
            aria-label="Send message"
            disabled={send.isPending || (!text.trim() && !file)}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary hover:bg-primary-hover disabled:opacity-50"
          >
            <Send className="size-5" />
          </button>
        </form>
      }
    >
      <h1 className="font-display text-[26px] leading-tight font-bold">Messages</h1>
      <p className="mb-3 text-[15px] text-muted">
        Chat with suppliers about your bookings, delivery and site details.
      </p>
      {conv.isPending && <ListSkeleton rows={1} thumb={false} />}
      {conv.isSuccess && !c && <EmptyState title="Conversation not found" />}
      {c && (
        <button
          type="button"
          onClick={() =>
            c.bookingId &&
            navigate(
              me?.org?.kind === 'supplier'
                ? `/supplier/bookings/${c.bookingId}`
                : `/bookings/${c.bookingId}`,
            )
          }
          className={cn(
            cardClass,
            'flex w-full items-center gap-3 p-3 text-left hover:border-line-input',
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-primary">
            <Truck className="size-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold">{c.title}</span>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              {c.online ? (
                <>
                  <span className="size-2 rounded-full bg-success" aria-hidden /> Online now
                </>
              ) : (
                c.subtitle
              )}
            </span>
          </span>
          <ChevronRight className="size-5 text-muted" aria-hidden />
        </button>
      )}
      {messages.isError && <ErrorState onRetry={() => void messages.refetch()} />}
      <ol className="mt-4 space-y-3" aria-live="polite" aria-label="Messages">
        {messages.data?.map((m) =>
          m.system ? (
            <li
              key={m.id}
              className="mx-auto max-w-[85%] rounded-lg bg-white/5 px-3 py-1.5 text-center text-xs text-muted"
            >
              {m.body}
            </li>
          ) : (
            <li key={m.id} className={cn('flex flex-col', mine(m) ? 'items-end' : 'items-start')}>
              <div
                className={cn(
                  'max-w-[78%] rounded-2xl px-4 py-2.5 text-[15px] leading-snug whitespace-pre-wrap',
                  mine(m)
                    ? 'rounded-br-md bg-primary text-white'
                    : 'rounded-bl-md bg-[#222c3c] text-fg',
                )}
              >
                {!mine(m) && <span className="sr-only">{m.senderName}: </span>}
                {m.body}
                {m.attachmentName && (
                  <span className="mt-1 flex items-center gap-1 text-xs opacity-90">
                    <Paperclip className="size-3" aria-hidden />
                    {m.attachmentName}
                  </span>
                )}
              </div>
              <span className="mt-1 flex items-center gap-1 px-1 text-[11px] text-muted">
                {format(parseISO(m.createdAt), 'h:mm a')}
                {mine(m) && (
                  <CheckCheck
                    className={cn('size-3.5', m.readAt ? 'text-primary' : 'text-muted')}
                    aria-label={m.readAt ? 'Read' : 'Sent'}
                  />
                )}
              </span>
            </li>
          ),
        )}
      </ol>
      <div ref={bottom} />
    </AppScreen>
  )
}
