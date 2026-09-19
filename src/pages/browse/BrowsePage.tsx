import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { ErrorState, ScreenTitle, Skeleton, StatusPill, Thumbnail } from '@/components/ui'
import { cardClass } from '@/components/ui/Card'
import { hirePill } from '@/components/domain/bookingStatus'
import { cn } from '@/lib/cn'
import { useActiveHires, useCategories } from '@/data/hooks'

const SHORT: Record<string, string> = { 'Access Equipment': 'Access' }

function ActiveHiresStrip() {
  const hires = useActiveHires()
  if (!hires.data?.length) return null
  return (
    <section aria-labelledby="active-hires-h" className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="active-hires-h" className="text-sm font-semibold">
          Active hires ({hires.data.length})
        </h2>
        <Link to="/hires" className="text-[13px] text-primary">
          View all ›
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1">
        {hires.data.map((b) => (
          <li key={b.id} className="snap-start">
            <Link
              to={`/hires/${b.id}`}
              className={cn(cardClass, 'flex w-60 items-center gap-2.5 p-2')}
            >
              <Thumbnail
                src={b.machine.photos[0]?.replace('.webp', '-sm.webp')}
                alt=""
                className="size-12"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{b.machine.title}</span>
                <span className="block truncate text-xs text-muted">{b.site?.name}</span>
              </span>
              <StatusPill {...hirePill(b)} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Board 03 · Browse Equipment (also the contractor Home, with an active-hires strip). */
export function BrowsePage() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const site = params.get('site')
  const categories = useCategories()

  return (
    <AppScreen root>
      {pathname === '/home' && <ActiveHiresStrip />}
      <ScreenTitle
        title="Browse Equipment"
        subtitle="Quality equipment from trusted suppliers across Australia."
      />
      {categories.isError && <ErrorState onRetry={() => void categories.refetch()} />}
      <ul className="grid grid-cols-2 gap-2.5">
        {categories.isPending &&
          Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <Skeleton className="aspect-[1/0.93] rounded-[14px]" />
            </li>
          ))}
        {categories.data?.map((c, i) => (
          <li key={c.id}>
            <Link
              to={`/search/results?category=${c.slug}${site ? `&site=${site}` : ''}`}
              className={cn(
                cardClass,
                'group flex aspect-[1/0.93] flex-col overflow-hidden transition-colors hover:border-line-input',
                i === 0 && 'border-primary shadow-[0_0_0_1px_var(--color-primary)_inset]',
              )}
            >
              <span className="relative flex-1 overflow-hidden">
                <img
                  src={c.imageUrl}
                  alt=""
                  loading={i < 4 ? 'eager' : 'lazy'}
                  className="absolute inset-0 size-full object-cover transition-transform group-hover:scale-105"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent"
                />
              </span>
              <span className="flex items-center justify-between px-3 pb-2.5 text-[15px] font-semibold">
                {SHORT[c.name] ?? c.name}
                <ChevronRight className="size-4" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/search" className="mt-4 block text-center text-sm text-primary">
        Search all equipment ›
      </Link>
    </AppScreen>
  )
}
