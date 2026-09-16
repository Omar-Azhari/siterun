import { useState, type ReactNode } from 'react'
import { addMonths, subMonths } from 'date-fns'
import {
  BarChart3,
  Building2,
  CalendarDays,
  Crown,
  FileText,
  Gauge,
  HardHat,
  Mail,
  MapPin,
  PackageOpen,
  Repeat2,
  Search as SearchIcon,
  Truck,
  User,
  Users,
  Zap,
} from 'lucide-react'
import { AppHeader } from '@/components/ui/AppHeader'
import { BottomNav } from '@/components/navigation/BottomNav'
import type { NavRole } from '@/components/navigation/navConfig'
import {
  AppleIcon,
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  Checkbox,
  Chip,
  CopyButton,
  DateField,
  EmptyState,
  ErrorState,
  GoogleIcon,
  InfoNote,
  Input,
  ListRow,
  ListSkeleton,
  MonthGrid,
  MonthNav,
  OrDivider,
  OtpInput,
  PasswordInput,
  PhoneField,
  Price,
  ProgressBar,
  RowIcon,
  ScreenTitle,
  SearchInput,
  SectionLabel,
  SegmentedTabs,
  Select,
  SelectableCard,
  Skeleton,
  Slider,
  StatTile,
  STATUS_STYLES,
  StatusPill,
  SuccessState,
  Textarea,
  Thumbnail,
  TimeField,
  Timeline,
  Toggle,
  ToggleRow,
  useToast,
  WeekStrip,
  type CountryCode,
  type StatusKey,
} from '@/components/ui'
import { formatAuMobile } from '@/components/ui/form/phone'

const SECTIONS = [
  'Header',
  'Titles',
  'Buttons',
  'Cards',
  'Selectable',
  'Pills',
  'Tabs',
  'Inputs',
  'Pickers',
  'Toggles',
  'OTP',
  'Stats',
  'Timeline',
  'Calendars',
  'Navigation',
  'Success',
  'Feedback',
  'Misc',
] as const

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id.toLowerCase()}
      aria-labelledby={`${id}-h`}
      className="scroll-mt-4 border-t border-line pt-6 pb-8"
    >
      <h2
        id={`${id}-h`}
        className="mb-4 font-mono text-xs font-semibold tracking-[0.18em] text-primary uppercase"
      >
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <p className="pt-2 font-mono text-[11px] text-subtle">{children}</p>
}

export function ComponentsPage() {
  const toast = useToast()
  const [role, setRole] = useState<'contractor' | 'supplier' | 'operator' | 'admin'>('contractor')
  const [plan, setPlan] = useState('pro')
  const [hire, setHire] = useState<'dry' | 'wet'>('dry')
  const [tab, setTab] = useState<'all' | 'site' | 'transit'>('all')
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [rate, setRate] = useState<'hourly' | 'daily' | 'weekly'>('hourly')
  const [search, setSearch] = useState('Excavator')
  const [country, setCountry] = useState<CountryCode>('AU')
  const [phone, setPhone] = useState('412 345 678')
  const [notes, setNotes] = useState('Enter via Gate 2. Report to site office. PPE required.')
  const [date, setDate] = useState('2025-05-26')
  const [emptyDate, setEmptyDate] = useState('')
  const [time, setTime] = useState('07:00')
  const [project, setProject] = useState('commercial')
  const [toggles, setToggles] = useState({
    delivery: true,
    sameDay: true,
    thirdParty: false,
    insurance: true,
  })
  const [keep, setKeep] = useState(true)
  const [otp, setOtp] = useState('274910')
  const [otpEmpty, setOtpEmpty] = useState('')
  const [radius, setRadius] = useState(50)
  const [day, setDay] = useState(new Date(2025, 5, 12))
  const [month, setMonth] = useState(new Date(2025, 5, 1))
  const [chips, setChips] = useState(['GP Bucket', 'Trenching Bucket', 'Hydraulic Hammer'])
  const [sheet, setSheet] = useState(false)
  const [replay, setReplay] = useState(0)
  const navRoles: NavRole[] = ['contractor', 'supplier', 'operator', 'admin']

  return (
    <div className="mx-auto max-w-[430px] px-4 pb-16">
      <header className="pt-6 pb-4">
        <h1 className="font-display text-2xl font-bold">Component gallery</h1>
        <p className="text-sm text-muted">Every SiteRun UI component in each of its states.</p>
        <nav aria-label="Sections" className="mt-4 flex flex-wrap gap-1.5">
          {SECTIONS.map((s) => (
            <a
              key={s}
              href={`#${s.toLowerCase()}`}
              className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-primary hover:text-fg"
            >
              {s}
            </a>
          ))}
        </nav>
      </header>

      <Section id="Header" title="AppHeader">
        <Label>back + bell</Label>
        <div className="rounded-xl border border-line">
          <AppHeader leading="back" onBack={() => undefined} />
        </div>
        <Label>menu + bell with unread dot</Label>
        <div className="rounded-xl border border-line">
          <AppHeader leading="menu" unread onMenu={() => toast.info('Menu opened')} />
        </div>
        <Label>no leading, no bell</Label>
        <div className="rounded-xl border border-line">
          <AppHeader leading="none" bell={false} />
        </div>
      </Section>

      <Section id="Titles" title="ScreenTitle / StepIndicator / SectionLabel">
        <ScreenTitle title="Active Hires" subtitle="Manage all your live equipment across sites." />
        <ScreenTitle
          title="Machine Details"
          step={{ current: 2, total: 6 }}
          subtitle="Enter the key details about your machine."
        />
        <SectionLabel action={<a href="#titles">View all ›</a>}>Recent Payouts</SectionLabel>
      </Section>

      <Section id="Buttons" title="Buttons">
        <Label>primary · with arrow</Label>
        <Button arrow onClick={() => toast.success('Extension confirmed', '3 days × $320/day')}>
          Extend Hire
        </Button>
        <Label>primary · loading / disabled</Label>
        <Button arrow loading>
          Saving
        </Button>
        <Button arrow disabled>
          Review &amp; Submit
        </Button>
        <Label>secondary (blue outline)</Label>
        <Button variant="secondary">Schedule Return</Button>
        <Button variant="secondary" leftIcon={<Repeat2 className="size-5 text-primary" />}>
          Smart Swap
        </Button>
        <Button variant="secondary" arrow leftIcon={<Truck className="size-5 text-primary" />}>
          Plan Dispatch
        </Button>
        <Label>outline (social sign-in)</Label>
        <Button variant="outline" leftIcon={<GoogleIcon className="absolute left-4 size-6" />}>
          Continue with Google
        </Button>
        <Button variant="outline" leftIcon={<AppleIcon className="absolute left-4 size-6" />}>
          Continue with Apple
        </Button>
        <Label>danger outline · side-by-side md</Label>
        <Button variant="danger">Log Out</Button>
        <div className="flex gap-2">
          <Button variant="danger" size="md" block>
            Decline
          </Button>
          <Button size="md" block>
            Accept
          </Button>
        </div>
        <Label>small · ghost</Label>
        <div className="flex items-center gap-2">
          <Button size="sm">Review</Button>
          <Button size="sm" variant="secondary">
            Edit
          </Button>
          <Button size="sm" variant="ghost">
            + Add attachment
          </Button>
        </div>
      </Section>

      <Section id="Cards" title="Card / ListRow / Thumbnail / InfoNote">
        <ListRow
          to="#cards"
          leading={<Thumbnail src="/images/does-not-exist.jpg" alt="3t Excavator" />}
          title="3t Excavator"
          subtitle="JCB 8035"
          meta={
            <>
              Riverside Estate
              <br />
              Melbourne, VIC
            </>
          }
          trailing={<StatusPill status="on_site" />}
        />
        <ListRow
          onClick={() => toast.info('Row pressed')}
          leading={
            <RowIcon>
              <Building2 className="size-6" strokeWidth={1.5} />
            </RowIcon>
          }
          title="Company Details"
          subtitle="Acme Construction Pty Ltd"
        />
        <ListRow title="Static row (no chevron)" subtitle="Not interactive" />
        <Card>
          <p className="text-[13px] text-muted">Estimated additional cost</p>
          <p className="mt-1">
            <span className="font-display text-3xl font-bold">$960</span>{' '}
            <span className="text-sm text-muted">(ex. GST)</span>
          </p>
          <p className="text-[13px] text-muted">3 days × $320/day</p>
        </Card>
        <Card className="divide-y divide-line py-0">
          <ListRow plain to="#cards" title="Grouped row one" subtitle="Inside one card" />
          <ListRow plain to="#cards" title="Grouped row two" subtitle="Inside one card" />
        </Card>
        <InfoNote>All documents must be verified before this machine can go live.</InfoNote>
      </Section>

      <Section id="Selectable" title="SelectableCard (radio / check)">
        <div role="radiogroup" aria-label="Plan" className="space-y-2">
          <SelectableCard
            selected={plan === 'starter'}
            onSelect={() => setPlan('starter')}
            indicator="radio"
            icon={<PackageOpen className="size-7" strokeWidth={1.5} />}
            title="Starter"
            description="Up to 3 sites · Basic features"
          />
          <SelectableCard
            selected={plan === 'pro'}
            onSelect={() => setPlan('pro')}
            indicator="check"
            icon={<Crown className="size-7" strokeWidth={1.5} />}
            title={
              <span className="flex items-center gap-2">
                Pro <Badge>Most Popular</Badge>
              </span>
            }
            label="Pro, Most Popular"
            description="Up to 10 sites · Advanced features"
          />
          <SelectableCard
            selected={plan === 'enterprise'}
            onSelect={() => setPlan('enterprise')}
            indicator="radio"
            icon={<Building2 className="size-7" strokeWidth={1.5} />}
            title="Enterprise"
            description="Unlimited sites · Dedicated support"
            disabled
          />
        </div>
        <Label>left indicator + price aside (Extend Hire)</Label>
        <div role="radiogroup" aria-label="Hire type" className="grid grid-cols-2 gap-2">
          <SelectableCard
            selected={hire === 'dry'}
            onSelect={() => setHire('dry')}
            indicatorPosition="left"
            title="Dry Hire"
            description="Machine only"
          />
          <SelectableCard
            selected={hire === 'wet'}
            onSelect={() => setHire('wet')}
            indicatorPosition="left"
            title="Wet Hire"
            description="With operator"
          />
        </div>
        <SelectableCard
          selected
          onSelect={() => undefined}
          indicatorPosition="left"
          title="+ 3 days"
          description="Tue, 10 Jun 2025"
          aside={<Price cents={32000} />}
        />
        <Label>role card</Label>
        <SelectableCard
          selected={false}
          onSelect={() => undefined}
          indicator="none"
          icon={<HardHat className="size-8" strokeWidth={1.5} />}
          title="Contractor"
          description="Hire equipment and manage projects"
        />
      </Section>

      <Section id="Pills" title="StatusPill (all statuses)">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_STYLES) as StatusKey[]).map((s) => (
            <StatusPill key={s} status={s} />
          ))}
          <StatusPill label="Due in 5 days" tone="neutral" />
          <StatusPill label="Expires in 12 days" tone="danger" mark="dot" />
          <StatusPill status="confirmed" size="md" />
        </div>
      </Section>

      <Section id="Tabs" title="SegmentedTabs">
        <Label>split with counts</Label>
        <SegmentedTabs
          label="Hire status"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: 'All', count: 5 },
            { value: 'site', label: 'On Site', count: 3 },
            { value: 'transit', label: 'In Transit', count: 1 },
          ]}
        />
        <Label>joined with badge</Label>
        <SegmentedTabs
          variant="joined"
          label="Billing period"
          value={billing}
          onChange={setBilling}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'annual', label: 'Annual', badge: <Badge tone="success">Save 20%</Badge> },
          ]}
        />
        <SegmentedTabs
          variant="joined"
          label="Rate period"
          value={rate}
          onChange={setRate}
          options={[
            { value: 'hourly', label: 'Hourly' },
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
          ]}
        />
      </Section>

      <Section id="Inputs" title="Input / Password / Search / Select / Phone / Textarea">
        <Input label="Full name" defaultValue="Jamie Carter" autoComplete="name" />
        <Input
          label="Email address"
          type="email"
          placeholder="you@company.com.au"
          leftIcon={<Mail />}
        />
        <Input label="ABN" defaultValue="51 824 753 556" valid inputMode="numeric" />
        <Input
          label="Serial number"
          defaultValue="CAT0320"
          error="Serial number must be at least 8 characters"
        />
        <Input
          label="Registration number"
          defaultValue="CR-3260"
          hint="e.g. State registration or fleet number"
        />
        <Input label="Disabled" defaultValue="Can't edit this" disabled />
        <Input
          label="Business address"
          leftIcon={<MapPin />}
          defaultValue="45 Industry Rd, Melbourne VIC"
        />
        <PasswordInput label="Password" defaultValue="hunter22" />
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder="Search categories…"
        />
        <Input
          label="Operating weight"
          defaultValue="21,300"
          rightSlot={<span className="text-sm text-muted">kg</span>}
        />
        <Input
          label="Daily rate (ex. GST)"
          defaultValue="850"
          leftIcon={<span className="text-fg">$</span>}
          inputMode="decimal"
        />
        <Select
          label="Project type"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          options={[
            { value: 'commercial', label: 'Commercial Construction' },
            { value: 'residential', label: 'Residential' },
            { value: 'civil', label: 'Civil & Infrastructure' },
          ]}
        />
        <Select
          label="Document type"
          placeholder="Choose a document type"
          defaultValue=""
          options={[{ value: 'ins', label: 'Insurance Certificate' }]}
        />
        <Select
          label="Fuel type"
          error="Please choose a fuel type"
          defaultValue=""
          placeholder="Select"
          options={[{ value: 'diesel', label: 'Diesel' }]}
        />
        <PhoneField
          country={country}
          onCountryChange={setCountry}
          value={phone}
          onChange={(e) => setPhone(formatAuMobile(e.target.value))}
        />
        <PhoneField
          label="Phone (error)"
          country="AU"
          onCountryChange={() => undefined}
          defaultValue="41"
          error="Enter a valid mobile number"
        />
        <Textarea
          label="Access notes (optional)"
          maxLength={250}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Textarea label="Notes (optional)" placeholder="Add a note…" rows={2} />
      </Section>

      <Section id="Pickers" title="DateField / TimeField">
        <DateField label="Start date" value={date} onChange={setDate} />
        <DateField label="Expiry date (empty)" value={emptyDate} onChange={setEmptyDate} />
        <DateField
          label="Available from (error)"
          value=""
          onChange={() => undefined}
          error="Choose a date"
        />
        <div className="flex items-end gap-2">
          <TimeField
            label="Delivery hours"
            value={time}
            onChange={setTime}
            compact
            className="flex-1"
          />
          <span aria-hidden className="mb-6 text-muted">
            →
          </span>
          <TimeField
            label="Until"
            hideLabel
            value="16:00"
            onChange={() => undefined}
            compact
            className="flex-1"
          />
        </div>
      </Section>

      <Section id="Toggles" title="Toggle / ToggleRow / Checkbox / Slider">
        <ToggleRow
          icon={<Truck strokeWidth={1.5} />}
          title="Offer delivery"
          description="Deliver to customer site"
          checked={toggles.delivery}
          onChange={(v) => setToggles((t) => ({ ...t, delivery: v }))}
        />
        <ToggleRow
          icon={<Zap strokeWidth={1.5} />}
          title="Same-day delivery"
          description="Available when possible"
          checked={toggles.sameDay}
          onChange={(v) => setToggles((t) => ({ ...t, sameDay: v }))}
        />
        <ToggleRow
          icon={<Truck strokeWidth={1.5} className="text-white" />}
          title="Third-party transport"
          description="Customer arranges own"
          checked={toggles.thirdParty}
          onChange={(v) => setToggles((t) => ({ ...t, thirdParty: v }))}
        />
        <ToggleRow
          card={false}
          title="Add insurance"
          description="Covers accidental damage"
          checked={toggles.insurance}
          onChange={(v) => setToggles((t) => ({ ...t, insurance: v }))}
        />
        <div className="flex items-center gap-4">
          <Toggle label="Disabled on" checked disabled onChange={() => undefined} />
          <Toggle label="Disabled off" checked={false} disabled onChange={() => undefined} />
        </div>
        <Checkbox checked={keep} onChange={setKeep}>
          Keep me signed in
        </Checkbox>
        <Slider
          label="Service radius"
          min={5}
          max={200}
          step={5}
          value={radius}
          onChange={setRadius}
          format={(v) => `${v} km`}
        />
      </Section>

      <Section id="OTP" title="OtpInput">
        <OtpInput value={otp} onChange={setOtp} />
        <Label>empty · paste a code or type</Label>
        <OtpInput
          value={otpEmpty}
          onChange={setOtpEmpty}
          onComplete={(c) => toast.success('Code entered', c)}
        />
        <Label>error</Label>
        <OtpInput
          value="1234"
          onChange={() => undefined}
          error="That code is incorrect. Try again."
        />
      </Section>

      <Section id="Stats" title="StatTile">
        <div className="grid grid-cols-2 gap-2">
          <StatTile icon={<CalendarDays strokeWidth={1.5} />} label="Hires" value="24" trend={20} />
          <StatTile icon={<Gauge strokeWidth={1.5} />} label="Utilisation" value="92%" trend={8} />
          <StatTile
            icon={<BarChart3 strokeWidth={1.5} />}
            label="Revenue"
            value="$48.3k"
            trend={18}
            className="col-span-2"
          />
          <StatTile icon={<Users strokeWidth={1.5} />} label="Users" value="1,248" trend={12} />
          <StatTile icon={<FileText strokeWidth={1.5} />} label="Disputes" value="8" trend={-33} />
          <StatTile layout="stack" label="Total Revenue" value="$48,320" trend={18} />
          <StatTile layout="stack" label="Completed Hires" value="28" trend={27} />
        </div>
      </Section>

      <Section id="Timeline" title="Timeline">
        <Timeline
          steps={[
            {
              title: 'Picked up from supplier',
              state: 'done',
              details: ['Today, 8:15 AM', 'Brooklyn, VIC'],
            },
            {
              title: 'In transit',
              state: 'current',
              details: [
                <span key="l" className="text-primary">
                  Live location
                </span>,
              ],
            },
            {
              title: 'Arriving at site',
              state: 'upcoming',
              details: ['Today, 11:30 AM', 'Airport Upgrade, Tullamarine, VIC'],
            },
            { title: 'Delivered to site', state: 'upcoming' },
          ]}
        />
      </Section>

      <Section id="Calendars" title="MonthNav / WeekStrip / MonthGrid">
        <Card>
          <MonthNav
            month={day}
            onPrev={() => setDay((d) => subMonths(d, 1))}
            onNext={() => setDay((d) => addMonths(d, 1))}
          />
          <WeekStrip
            selected={day}
            onSelect={setDay}
            marked={[new Date(2025, 5, 14)]}
            className="mt-1"
          />
        </Card>
        <Card>
          <MonthNav
            month={month}
            onPrev={() => setMonth((m) => subMonths(m, 1))}
            onNext={() => setMonth((m) => addMonths(m, 1))}
          />
          <MonthGrid
            month={month}
            selected={day}
            onSelect={setDay}
            marked={[new Date(2025, 5, 12), new Date(2025, 5, 20), new Date(2025, 6, 1)]}
            className="mt-1"
          />
        </Card>
      </Section>

      <Section id="Navigation" title="BottomNav (per role)">
        <SegmentedTabs
          variant="joined"
          label="Role"
          value={role}
          onChange={setRole}
          options={navRoles.map((r) => ({ value: r, label: r[0]?.toUpperCase() + r.slice(1) }))}
        />
        <div className="overflow-hidden rounded-xl border border-line">
          <BottomNav role={role} fixed={false} badges={{ Messages: 2, Approvals: 3 }} />
        </div>
        <p className="text-xs text-muted">
          The active item follows the current URL. The Messages and Approvals badges show unread
          counts.
        </p>
      </Section>

      <Section id="Success" title="SuccessState">
        <Card className="py-6" key={replay}>
          <SuccessState
            title="Booking Confirmed!"
            description="Your equipment is booked and a confirmation has been sent to your email."
          />
        </Card>
        <Button variant="secondary" size="md" onClick={() => setReplay((r) => r + 1)}>
          Replay animation
        </Button>
      </Section>

      <Section id="Feedback" title="Empty / Error / Loading / Toast / BottomSheet">
        <EmptyState
          icon={<SearchIcon strokeWidth={1.75} />}
          title="No machines found"
          description="Try widening your dates or search radius."
          action={<Button size="md">Reset filters</Button>}
        />
        <ErrorState onRetry={() => toast.info('Retrying…')} />
        <ListSkeleton rows={2} />
        <div className="flex gap-2">
          <Skeleton className="h-20 flex-1" />
          <Skeleton className="h-20 flex-1" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toast.success('Invitations sent', '2 team members invited')}
          >
            Success
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toast.error('Upload failed', 'Files must be under 10MB')}
          >
            Error
          </Button>
          <Button size="sm" variant="secondary" onClick={() => toast.info('Draft saved')}>
            Info
          </Button>
        </div>
        <Button variant="secondary" onClick={() => setSheet(true)}>
          Open bottom sheet
        </Button>
        <BottomSheet
          open={sheet}
          onClose={() => setSheet(false)}
          title="Filters"
          footer={<Button onClick={() => setSheet(false)}>Apply</Button>}
        >
          <DateField label="Start date" value={date} onChange={setDate} />
          <Slider
            label="Search radius"
            min={5}
            max={200}
            value={radius}
            onChange={setRadius}
            format={(v) => `${v} km`}
          />
        </BottomSheet>
      </Section>

      <Section id="Misc" title="Avatar / Chip / Progress / Divider / Copy / Price / Badge">
        <div className="flex items-center gap-3">
          <Avatar name="Alex Turner" size="lg" />
          <Avatar name="Alex Turner" />
          <Avatar name="John Smith" size="sm" />
          <User className="size-5 text-muted" aria-hidden />
        </div>
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <Chip key={c} onRemove={() => setChips((list) => list.filter((x) => x !== c))}>
              {c}
            </Chip>
          ))}
          {chips.length === 0 && <span className="text-sm text-muted">All chips removed</span>}
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>3t Excavator</span>
            <span className="text-muted">100%</span>
          </div>
          <ProgressBar value={100} label="3t Excavator utilisation" />
          <ProgressBar value={83} label="40KVA Generator utilisation" />
        </div>
        <OrDivider />
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-[13px] text-muted">Booking ID</p>
            <p className="font-display text-xl font-bold">SR-2025-7842</p>
          </div>
          <CopyButton value="SR-2025-7842" label="Copy booking ID" />
        </Card>
        <div className="flex flex-wrap items-baseline gap-4">
          <Price cents={32000} />
          <Price cents={45000} size="sm" />
          <Price cents={24900} unit="month" size="lg" />
          <Price cents={5000} prefix="+ " />
        </div>
        <div className="flex gap-2">
          <Badge>Most Popular</Badge>
          <Badge tone="success">Save 20%</Badge>
        </div>
      </Section>
    </div>
  )
}
