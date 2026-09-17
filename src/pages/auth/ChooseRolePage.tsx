import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Screen } from '@/components/layout/Screen'
import { Button, ScreenTitle, SelectableCard } from '@/components/ui'
import type { AccountType } from '@/data/types'
import { ROLE_OPTIONS } from './authShared'

/** Board 01 · Choose Role. "Admin" is an organisation admin, never a platform admin. */
export function ChooseRolePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const initial = (params.get('role') as AccountType | null) ?? 'contractor'
  const [role, setRole] = useState<AccountType>(initial)

  return (
    <Screen
      header={{ bell: false }}
      footer={
        <Button arrow onClick={() => navigate(`/signup?role=${role}`)}>
          Continue
        </Button>
      }
    >
      <ScreenTitle
        title="How do you use SiteRun?"
        subtitle="Choose the option that best describes you."
      />
      <div role="radiogroup" aria-label="Account type" className="space-y-2.5">
        {ROLE_OPTIONS.map((o) => (
          <SelectableCard
            key={o.value}
            selected={role === o.value}
            onSelect={() => setRole(o.value)}
            indicator="none"
            icon={<o.icon className="size-9" strokeWidth={1.5} />}
            title={o.title}
            description={o.description}
            aside={<ChevronRight className="size-5 text-muted" aria-hidden />}
            className="min-h-[76px]"
          />
        ))}
      </div>
    </Screen>
  )
}
