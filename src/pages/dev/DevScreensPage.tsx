import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ExternalLink, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui'
import { getApi, isDemo } from '@/data/client'
import { BOARDS, SCREENS } from './screenRegistry'

/** Opens any screen with the right demo login: /dev/screens?go=/path&as=email */
export function DevScreensPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const go = params.get('go')
  const as = params.get('as')

  useEffect(() => {
    if (!go) return
    const api = getApi()
    ;(async () => {
      try {
        if (!isDemo(api)) throw new Error('Screen jumping needs demo mode (no Supabase env vars).')
        if (params.get('reset') === '1') api.reset()
        if (as) await api.impersonate(as)
        else await api.signOut()
        qc.clear()
        navigate(go, { replace: true })
      } catch (e) {
        setError((e as Error).message)
      }
    })()
  }, [go, as, params, navigate, qc])

  if (go) return <p className="p-6 text-muted">{error ?? 'Opening screen…'}</p>

  const href = (path: string, email: string | null) =>
    `/dev/screens?go=${encodeURIComponent(path)}${email ? `&as=${encodeURIComponent(email)}` : ''}`

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Screen index</h1>
          <p className="text-sm text-muted">
            {SCREENS.length} screens. Each link signs in as the right demo account first. Compare
            with the boards in <code>design/</code>.
          </p>
        </div>
        {isDemo(getApi()) && (
          <Button
            size="sm"
            variant="secondary"
            block={false}
            leftIcon={<RotateCcw className="size-4" />}
            onClick={() => {
              const api = getApi()
              if (isDemo(api)) api.reset()
              qc.clear()
            }}
          >
            Reset demo data
          </Button>
        )}
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {BOARDS.map((b) => (
          <section key={b.id} className="rounded-2xl border border-line bg-card p-4">
            <h2 className="font-display font-semibold">
              {b.id === 'extra' ? '' : `${b.id}. `}
              {b.title}
            </h2>
            <ol className="mt-2 divide-y divide-line">
              {SCREENS.filter((s) => s.board === b.id).map((s) => (
                <li key={s.path} className="flex items-center justify-between gap-3 py-2">
                  <Link to={href(s.path, s.as)} className="min-w-0 flex-1 hover:text-primary">
                    <span className="mr-2 text-subtle">{s.n}.</span>
                    {s.title}
                    <span className="block truncate font-mono text-[11px] text-subtle">
                      {s.path} {s.as ? `· ${s.as}` : '· signed out'}
                    </span>
                  </Link>
                  <a
                    href={href(s.path, s.as)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${s.title} in a new tab`}
                    className="p-2 text-muted hover:text-fg"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </main>
  )
}
