import { Logo } from '@/components/brand/Logo'

interface Swatch {
  token: string
  value: string
  /** Estimate from the build brief, shown where sampling changed it. */
  estimate?: string
  note: string
}

const brand: Swatch[] = [
  { token: 'navy', value: '#0B1F44', note: 'SiteRun Navy' },
  { token: 'brand-blue', value: '#006CFF', note: 'Construction Blue' },
  { token: 'charcoal', value: '#2E3A46', note: 'Charcoal' },
  { token: 'board', value: '#F4F7FB', note: 'Presentation / landing background' },
]

const app: Swatch[] = [
  { token: 'app', value: '#011020', estimate: '#050A14', note: 'Screen background' },
  { token: 'card', value: '#04182B', estimate: '#0D1626', note: 'Cards, list rows' },
  { token: 'card-2', value: '#051C2E', note: 'Card gradient bottom' },
  { token: 'input', value: '#0A2439', estimate: '#0F1A2C', note: 'Input fields' },
  { token: 'selected', value: '#002349', note: 'Selected card tint' },
  { token: 'line', value: '#1A2D3E', estimate: '#1C2A40', note: 'Card border' },
  { token: 'line-input', value: '#2A3F50', note: 'Input border' },
  { token: 'primary', value: '#006CFF', note: 'Primary buttons, active tabs' },
  { token: 'primary-hover', value: '#0A5CE0', note: 'Button hover' },
  { token: 'fg', value: '#FFFFFF', note: 'Text' },
  { token: 'muted', value: '#AEB9C9', estimate: '#9AA6B8', note: 'Subtitles, meta text' },
  { token: 'subtle', value: '#7F8A9B', estimate: '#6B7890', note: 'Inactive nav, hints' },
  { token: 'success', value: '#22C55E', note: 'Available, Paid, Verified' },
  { token: 'warning', value: '#F5A524', note: 'Pending, In Progress, On Hold' },
  { token: 'danger', value: '#EF4444', note: 'Decline, Rejected, Log Out' },
  { token: 'info', value: '#3B82F6', note: 'In Transit, Planning, Upcoming' },
]

function SwatchGrid({ items, dark }: { items: Swatch[]; dark: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((s) => (
        <li
          key={s.token}
          className={
            dark ? 'rounded-xl border border-line bg-card p-3' : 'rounded-xl bg-white p-3 shadow-sm'
          }
        >
          <div className="h-12 rounded-lg border border-black/10" style={{ background: s.value }} />
          <p className={`mt-2 text-sm font-semibold ${dark ? 'text-fg' : 'text-navy'}`}>
            {s.token}
          </p>
          <p className={`font-mono text-xs ${dark ? 'text-muted' : 'text-charcoal'}`}>
            {s.value}
            {s.estimate && <span className="text-subtle"> (was {s.estimate})</span>}
          </p>
          <p className={`text-xs ${dark ? 'text-subtle' : 'text-charcoal'}`}>{s.note}</p>
        </li>
      ))}
    </ul>
  )
}

export function BrandPage() {
  return (
    <main>
      <section className="bg-board px-4 py-10 text-navy sm:px-10">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Checkpoint 0: Brand and tokens
        </h1>
        <div className="mt-8 flex flex-wrap items-center gap-10">
          <img src="/brand/logo-horizontal.svg" alt="SiteRun horizontal logo" className="h-16" />
          <img src="/brand/logo-mark.svg" alt="SiteRun mark" className="h-16" />
          <img src="/brand/app-icon.svg" alt="SiteRun app icon" className="h-20" />
          <img
            src="/brand/logo-lockup-tagline.svg"
            alt="SiteRun logo with tagline"
            className="h-20"
          />
        </div>
        <h2 className="mt-10 font-display text-xl font-bold">
          Keep projects <span className="text-brand-blue">moving.</span>
        </h2>
        <p className="mt-1 text-charcoal">Machines. People. Progress.</p>
        <h3 className="mt-8 mb-3 text-sm font-bold tracking-[0.2em] uppercase">Brand palette</h3>
        <SwatchGrid items={brand} dark={false} />
      </section>

      <section className="px-4 py-10 sm:px-10">
        <div className="flex items-center justify-center rounded-xl border border-line bg-card px-4 py-3">
          <Logo className="h-6" />
        </div>
        <h2 className="mt-6 font-display text-[22px] font-semibold">App UI tokens (sampled)</h2>
        <p className="text-sm text-muted">
          Values measured from the phone screens. Where sampling changed the brief, the old estimate
          is shown.
        </p>
        <div className="mt-4">
          <SwatchGrid items={app} dark />
        </div>
        <h3 className="mt-8 font-display text-[22px] font-semibold">
          Screen title in Plus Jakarta Sans
        </h3>
        <p className="text-sm text-muted">
          Subtitle and body copy in Inter. Manage all your live equipment across sites.
        </p>
        <p className="mt-2 text-[15px] font-semibold">Card title 15px</p>
        <p className="text-[13px] text-muted">Meta text 13px, Riverside Estate, Melbourne VIC</p>
        <p className="mt-2 text-xl font-bold">
          $320 <span className="text-sm font-normal text-muted">/ day</span>
        </p>
      </section>
    </main>
  )
}
