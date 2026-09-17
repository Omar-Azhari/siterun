import { CircleCheck } from 'lucide-react'
import { cn } from '@/lib/cn'
import { passwordRules } from '@/pages/auth/authShared'

export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="-mt-1 mb-4 space-y-1.5" aria-label="Password requirements">
      {passwordRules.map((r) => {
        const ok = r.test(value)
        return (
          <li
            key={r.label}
            className={cn(
              'flex items-center gap-2 text-[13px]',
              ok ? 'text-[#dae4ef]' : 'text-muted',
            )}
          >
            <CircleCheck
              aria-hidden
              className={cn('size-[18px]', ok ? 'fill-success text-app' : 'text-subtle')}
              strokeWidth={2}
            />
            {r.label}
            <span className="sr-only">{ok ? '(met)' : '(not met)'}</span>
          </li>
        )
      })}
    </ul>
  )
}
