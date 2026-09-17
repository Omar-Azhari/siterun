import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { z } from 'zod'
import { AppScreen } from '@/components/layout/AppScreen'
import { Avatar, Button, Card, ListSkeleton, ScreenTitle, SectionLabel, SelectableCard } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useApiMutation, useInvitations, useMe, useMembers } from '@/data/hooks'
import type { MemberRole } from '@/data/types'
import { ROLE_LABELS } from '@/auth/roles'
import { ROLE_CARDS } from '@/components/domain/roleCards'

const emailSchema = z.email()

/** Board 02 · Invite Team Members */
export function InviteTeamPage() {
  const [params] = useSearchParams()
  const onboarding = params.get('onboarding') === '1'
  const navigate = useNavigate()
  const { data: me } = useMe()
  const members = useMembers()
  const invitations = useInvitations()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('project_manager')
  const [pending, setPending] = useState<{ email: string; role: MemberRole }[]>([])
  const [error, setError] = useState<string>()
  const send = useApiMutation((api, list: typeof pending) => api.inviteMembers(list), {
    success: (r) => `${r.length} invitation${r.length === 1 ? '' : 's'} sent`,
  })
  const canInvite = me?.role === 'owner' || me?.role === 'project_manager'

  const add = () => {
    const value = email.trim().toLowerCase()
    if (!emailSchema.safeParse(value).success) {
      setError('Enter a valid email address')
      return
    }
    if (members.data?.some((m) => m.email === value) || pending.some((p) => p.email === value)) {
      setError('That person is already on the list')
      return
    }
    setError(undefined)
    setPending((p) => [...p, { email: value, role }])
    setEmail('')
  }

  const rows = [
    ...(members.data ?? []).map((m) => ({ key: m.id, name: m.name, email: m.email, role: m.role, status: 'member' as const })),
    ...(invitations.data ?? []).map((i) => ({ key: i.id, name: i.email.split('@')[0] ?? i.email, email: i.email, role: i.role, status: 'invited' as const })),
    ...pending.map((p) => ({ key: `new-${p.email}`, name: p.email.split('@')[0] ?? p.email, email: p.email, role: p.role, status: 'new' as const })),
  ]

  const finish = () => navigate(onboarding ? '/plans?onboarding=1' : '/team')

  return (
    <AppScreen
      hideNav={onboarding}
      footer={
        <>
          <Button
            arrow
            disabled={!canInvite || (pending.length === 0 && !onboarding)}
            loading={send.isPending}
            onClick={() => (pending.length ? send.mutate(pending, { onSuccess: () => { setPending([]); finish() } }) : finish())}
          >
            {pending.length || !onboarding ? 'Send Invitations' : 'Skip for now'}
          </Button>
        </>
      }
    >
      <ScreenTitle title="Invite Team Members" subtitle="Add your team and set their roles." />
      {!canInvite && me && (
        <p className="mb-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-[13px] text-[#f7b84b]">
          Only owners and project managers can invite people.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
        className="flex items-start gap-0"
        noValidate
      >
        <div className="flex-1">
          <label htmlFor="invite-email" className="sr-only">
            Email address
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'invite-error' : undefined}
            className={cn(
              'h-12 w-full rounded-l-[10px] border border-r-0 bg-input px-3.5 text-[15px] outline-none placeholder:text-subtle focus:border-primary',
              error ? 'border-danger' : 'border-line-input',
            )}
          />
        </div>
        <button type="submit" aria-label="Add to invite list" disabled={!canInvite} className="flex h-12 w-12 items-center justify-center rounded-r-[10px] bg-primary hover:bg-primary-hover disabled:opacity-45">
          <Plus className="size-6" />
        </button>
      </form>
      {error && (
        <p id="invite-error" role="alert" className="mt-1 text-xs text-[#f87171]">
          {error}
        </p>
      )}

      <SectionLabel>Team Roles</SectionLabel>
      <div role="radiogroup" aria-label="Role for new invites" className="space-y-2">
        {ROLE_CARDS.map((r) => (
          <SelectableCard
            key={r.value}
            selected={role === r.value}
            onSelect={() => setRole(r.value)}
            indicator={role === r.value ? 'check' : 'radio'}
            icon={r.icon}
            title={r.title}
            description={r.description}
            className="py-2.5"
          />
        ))}
      </div>

      <SectionLabel>Invited Members ({rows.length})</SectionLabel>
      {members.isPending ? (
        <ListSkeleton rows={2} thumb={false} />
      ) : (
        <Card className="divide-y divide-line px-3 py-0">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-3 py-2.5">
              <Avatar name={r.name.includes('@') ? r.email : r.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold capitalize">{r.name}</p>
                <p className="truncate text-xs text-muted">{r.email}</p>
              </div>
              <div className="text-right text-xs">
                <p className="text-[#dae4ef]">{ROLE_LABELS[r.role]}</p>
                {r.status !== 'member' && <p className="text-primary">{r.status === 'new' ? 'Not sent' : 'Invited'}</p>}
              </div>
              {r.status === 'new' && (
                <button type="button" aria-label={`Remove ${r.email}`} onClick={() => setPending((p) => p.filter((x) => x.email !== r.email))} className="-mr-2 flex size-9 items-center justify-center rounded-lg text-muted hover:bg-white/5">
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
        </Card>
      )}
    </AppScreen>
  )
}
