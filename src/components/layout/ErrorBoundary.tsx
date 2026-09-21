import { Component, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { ErrorState } from '@/components/ui'
import { reportError } from '@/lib/errorReporting'

type Props = { children: ReactNode }

class Boundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    reportError(error, 'Screen crashed')
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-4">
        <ErrorState
          className="w-full"
          description="This screen hit a problem and has been reported. Reload to try again."
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }
}

/** Catches a crashing screen, reports it, and clears itself when the user navigates away. */
export function ErrorBoundary({ children }: Props) {
  const { pathname } = useLocation()
  return <Boundary key={pathname}>{children}</Boundary>
}
