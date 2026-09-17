import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { Avatar, BottomSheet, Button, ButtonLink, Card, ErrorState, ListSkeleton, ScreenTitle, SectionLabel, SelectableCard } from '@/components/ui'
import { useApiMutation, useInvitations, useMe, useMembers } from '@/data/hooks'
import type { MemberRole, OrgMember } from '@/data/types'
import { ROLE_LABELS } from '@/auth/roles'
import { ROLE_CARDS } from '@/components/domain/roleCards'

const PERMISSIONS: Record<MemberRole, string[]> = {
  owner: ['Billing, plans and payouts', 'Invite and remove people', 'Create and edit sites', 'Create and change bookings'],
  project_manager: ['Invite people', 'Create and edit sites', 'Create and change bookings'],
  site_manager: ['Edit site details', 'Create and change bookings', 'Schedule returns and swaps'],
  viewer: ['View sites, bookings and reports'],
}

/** Account › Team & Permissions */
export function TeamPage() {
  const { data: me } = useMe()
  const members = useMembers()
  const invites = useInvitations()
  const [editing, setEditing] = useState<OrgMember | null>(null)
  const [role, setRole] = useState<MemberRole>('viewer')
  const update = useApiMutation((api, v: { id: string; role: MemberRole }) => api.updateMemberRole(v.id, v.role), { success: 'Role updated' })
  const isOwner = me?.role === 'owner'

  return (
    <AppScreen footer={<ButtonLink to="/team/invite" leftIcon={<UserPlus className="size-5" />}>Invite Team Members</ButtonLink>}>
      <ScreenTitle title="Team & Permissions" subtitle={me?.org?.name} />
      {members.isPending && <ListSkeleton rows={3} thumb={false} />}
      {members.isError && <ErrorState onRetry={() => void members.refetch()} />}
      {members.data && (
        <Card className="divide-y divide-line px-3 py-0">
          {members.data.map((m) => {
            const self = m.profileId === me?.profile.id
            return (
              <button
                key={m.id}
                type="button"
                disabled={!isOwner || self}
                onClick={() => {
                  setEditing(m)
                  setRole(m.role)
                }}
                className="flex w-full items-center gap-3 py-3 text-left disabled:cursor-default"
              >
                <Avatar name={m.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {m.name} {self && <span className="font-normal text-muted">(you)</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">{m.email}</span>
                </span>
                <span className="text-xs text-[#dae4ef]">{ROLE_LABELS[m.role]}</span>
              </button>
            )
          })}
        </Card>
      )}
      {!!invites.data?.length && (
        <>
          <SectionLabel>Pending invitations ({invites.data.length})</SectionLabel>
          <Card className="divide-y divide-line px-3 py-0">
            {invites.data.map((i) => (
              <div key={i.id} className="flex items-center justify-between py-3 text-sm">
                <span className="truncate">{i.email}</span>
                <span className="text-xs text-primary">{ROLE_LABELS[i.role]} · Invited</span>
              </div>
            ))}
          </Card>
        </>
      )}
      <SectionLabel>What each role can do</SectionLabel>
      <div className="space-y-2">
        {ROLE_CARDS.map((r) => (
          <Card key={r.value} className="flex gap-3 py-3">
            <span className="shrink-0">{r.icon}</span>
            <div>
              <p className="text-sm font-semibold">{r.title}</p>
              <ul className="mt-0.5 list-disc pl-4 text-xs text-muted">
                {PERMISSIONS[r.value].map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      <BottomSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Change role for ${editing?.name ?? ''}`}
        footer={
          <Button
            loading={update.isPending}
            onClick={() => editing && update.mutate({ id: editing.id, role }, { onSuccess: () => setEditing(null) })}
          >
            Save Role
          </Button>
        }
      >
        <div role="radiogroup" aria-label="Role" className="space-y-2">
          {ROLE_CARDS.map((r) => (
            <SelectableCard key={r.value} selected={role === r.value} onSelect={() => setRole(r.value)} icon={r.icon} title={r.title} description={r.description} />
          ))}
        </div>
      </BottomSheet>
    </AppScreen>
  )
}
