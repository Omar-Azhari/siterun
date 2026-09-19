import { Link } from 'react-router-dom'
import {
  BadgeCheck,
  CalendarRange,
  ChartNoAxesColumnIncreasing,
  FileCheck2,
  HardHat,
  MapPin,
  Navigation,
  Receipt,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { ButtonLink } from '@/components/ui/Button'
import { img, imgSm } from '@/lib/images'

const CONTRACTOR: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: MapPin,
    title: 'Plant near your site',
    text: 'Search by machine, size and dates. Only suppliers who service your site show up.',
  },
  {
    icon: CalendarRange,
    title: 'Book in minutes',
    text: 'Dry or wet hire, delivery or pickup, insurance on the same booking.',
  },
  {
    icon: Navigation,
    title: 'Track every delivery',
    text: 'See the truck on the map and the ETA until the machine is on site.',
  },
  {
    icon: Receipt,
    title: 'Extend, swap or return',
    text: 'Change a hire from your phone. Tax invoices land in one place.',
  },
]

const SUPPLIER: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Truck,
    title: 'List your fleet',
    text: 'Photos, specs, rates and service area for each machine.',
  },
  {
    icon: FileCheck2,
    title: 'Compliance handled',
    text: 'Insurance, registration and CraneSafe checked before a listing goes live, with expiry reminders.',
  },
  {
    icon: BadgeCheck,
    title: 'Requests, dispatch, collection',
    text: 'Accept jobs, plan deliveries and close hires out with an invoice.',
  },
  {
    icon: Wallet,
    title: 'Payouts and performance',
    text: 'Earnings, utilisation and your best machines at a glance.',
  },
]

const VALUES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: HardHat, title: 'Built for real work', text: 'Tough challenges. Real solutions.' },
  { icon: Truck, title: 'Keep things moving', text: 'More uptime. Greater progress.' },
  { icon: Users, title: 'People at the core', text: 'Stronger teams. Brighter outcomes.' },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: 'A more productive tomorrow',
    text: 'Connected today. A stronger tomorrow.',
  },
]

const CATEGORIES = [
  { name: 'Excavators', image: 'excavator-komatsu' },
  { name: 'Telehandlers', image: 'telehandler-yard' },
  { name: 'Cranes', image: 'crane-mobile' },
  { name: 'Generators', image: 'generator-white' },
  { name: 'Access Equipment', image: 'access-lifts' },
  { name: 'Loaders', image: 'loader' },
]

function FeatureList({ items }: { items: typeof CONTRACTOR }) {
  return (
    <ul className="mt-6 grid gap-5 sm:grid-cols-2">
      {items.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex gap-3">
          <Icon className="mt-0.5 size-6 shrink-0 text-primary" strokeWidth={1.6} aria-hidden />
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-[15px] leading-snug text-[#dae4ef]">{text}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Public marketing page at `/` for signed-out visitors. */
export function LandingPage() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-app/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" aria-label="SiteRun home">
            <Logo className="h-6" />
          </Link>
          <nav aria-label="Sections" className="hidden gap-6 text-[15px] text-[#dae4ef] md:flex">
            <a href="#contractors" className="hover:text-fg">
              Contractors
            </a>
            <a href="#suppliers" className="hover:text-fg">
              Suppliers
            </a>
            <a href="#equipment" className="hover:text-fg">
              Equipment
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/login" className="px-3 py-2 text-[15px] font-semibold hover:text-primary">
              Log in
            </Link>
            <ButtonLink to="/signup/role" size="md" className="hidden w-auto px-5 sm:inline-flex">
              Get Started
            </ButtonLink>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <img
            src={img('splash-excavator-frame')}
            srcSet={`${imgSm('splash-excavator-frame')} 480w, ${img('splash-excavator-frame')} 1200w`}
            // The hero sits under a dark overlay, so phones get the 480px file.
            sizes="(min-width: 768px) 100vw, 270px"
            alt=""
            className="absolute inset-0 -z-10 size-full object-cover object-[70%_center]"
            {...{ fetchpriority: 'high' }}
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[#011020]/80 md:bg-[linear-gradient(90deg,#011020_0%,rgba(1,16,32,0.92)_45%,rgba(1,16,32,0.45)_100%)]"
          />
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
            <h1 className="max-w-2xl font-display text-[44px] leading-[1.02] font-extrabold tracking-tight md:text-[64px]">
              Keep projects <span className="text-primary">moving.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-snug text-[#dae4ef] md:text-xl">
              The construction equipment platform that connects people, equipment and projects, so
              the world gets built.
            </p>
            <div className="mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
              <ButtonLink to="/signup/role?role=contractor" arrow>
                Hire Equipment
              </ButtonLink>
              <ButtonLink to="/signup/role?role=supplier" variant="secondary">
                List Your Fleet
              </ButtonLink>
            </div>
          </div>
        </section>

        <section
          id="contractors"
          className="mx-auto grid max-w-6xl scroll-mt-16 gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1.2fr] md:items-center"
        >
          <img
            src={imgSm('site-crane')}
            srcSet={`${imgSm('site-crane')} 480w, ${img('site-crane')} 1200w`}
            sizes="(min-width: 768px) 40vw, 270px"
            alt="Crane working on a construction site"
            loading="lazy"
            className="aspect-[4/3] w-full rounded-2xl object-cover"
          />
          <div>
            <p className="text-sm font-semibold tracking-wide text-[#6aa9ff] uppercase">
              For contractors
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
              The right machine, on site when you need it.
            </h2>
            <FeatureList items={CONTRACTOR} />
          </div>
        </section>

        <section id="suppliers" className="border-y border-line bg-card/40">
          <div className="mx-auto grid max-w-6xl scroll-mt-16 gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div>
              <p className="text-sm font-semibold tracking-wide text-[#6aa9ff] uppercase">
                For suppliers
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
                More hires for the fleet you already own.
              </h2>
              <FeatureList items={SUPPLIER} />
            </div>
            <img
              src={imgSm('telehandler-yard')}
              srcSet={`${imgSm('telehandler-yard')} 480w, ${img('telehandler-yard')} 1200w`}
              sizes="(min-width: 768px) 40vw, 270px"
              alt="Telehandlers parked in a hire yard"
              loading="lazy"
              className="aspect-[4/3] w-full rounded-2xl object-cover md:order-last"
            />
          </div>
        </section>

        <section id="equipment" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Equipment on SiteRun
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {CATEGORIES.map((c) => (
              <li key={c.name} className="relative overflow-hidden rounded-xl border border-line">
                <img
                  src={imgSm(c.image)}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 bg-[#011020]/80 px-3 py-2 text-[15px] font-semibold">
                  {c.name}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="values" className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 id="values" className="sr-only">
              What we stand for
            </h2>
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {VALUES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <Icon className="size-10 shrink-0 text-primary" strokeWidth={1.5} aria-hidden />
                  <div>
                    <h3 className="text-sm font-bold tracking-wider uppercase">{title}</h3>
                    <p className="mt-1 text-[15px] text-[#dae4ef]">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="rounded-2xl border border-line bg-card px-6 py-10 md:flex md:items-center md:justify-between md:px-10">
            <div>
              <h2 className="font-display text-3xl font-extrabold tracking-tight">
                Machines. People. Progress.
              </h2>
              <p className="mt-2 max-w-xl text-[#dae4ef]">
                SiteRun helps people, equipment and operations work together to build a more
                productive tomorrow.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3 md:mt-0 md:w-64">
              <ButtonLink to="/signup/role" arrow>
                Get Started
              </ButtonLink>
              <ButtonLink to="/login" variant="secondary">
                Log In
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:px-6 md:flex-row md:items-center md:justify-between">
          <img
            src="/brand/logo-lockup-tagline-white.svg"
            alt="SiteRun. Machines. People. Progress."
            className="h-12 w-auto"
          />
          <nav aria-label="Legal" className="flex gap-5">
            <Link to="/terms" className="hover:text-fg">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-fg">
              Privacy
            </Link>
            <Link to="/login" className="hover:text-fg">
              Log in
            </Link>
          </nav>
          <p>© {new Date().getFullYear()} SiteRun Pty Ltd</p>
        </div>
      </footer>
    </div>
  )
}
