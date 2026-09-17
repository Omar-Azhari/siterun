import { SearchX } from 'lucide-react'
import { Screen } from '@/components/layout/Screen'
import { ButtonLink, EmptyState } from '@/components/ui'

export function NotFoundPage() {
  return (
    <Screen header={{ bell: false }}>
      <EmptyState
        className="mt-10"
        icon={<SearchX strokeWidth={1.75} />}
        title="Page not found"
        description="The page you’re looking for doesn’t exist or has moved."
        action={
          <ButtonLink to="/" size="md" block>
            Go home
          </ButtonLink>
        }
      />
    </Screen>
  )
}
