import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronRight, Landmark } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { AddressAutocomplete } from '@/components/domain/AddressAutocomplete'
import { BrandMark } from '@/components/domain/BrandMark'
import { PasswordChecklist } from '@/components/domain/PasswordChecklist'
import { Button, Card, Input, ListRow, PasswordInput, ScreenTitle, SectionLabel, Skeleton, ToggleRow } from '@/components/ui'
import { formatAbn, isValidAbn } from '@/lib/abn'
import { formatDate, formatMoney } from '@/lib/format'
import { useApiMutation, useMe, usePaymentMethods, usePayoutSummary, useSubscription } from '@/data/hooks'
import { areaFor } from '@/auth/roles'
import { passwordSchema, phoneSchema } from '../auth/authShared'

const profileSchema = z.object({ fullName: z.string().trim().min(2, 'Enter your name'), phone: phoneSchema })

export function ProfilePage() {
  const { data: me } = useMe()
  const navigate = useNavigate()
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: me ? { fullName: me.profile.fullName, phone: me.profile.phone } : undefined,
  })
  const save = useApiMutation((api, v: z.infer<typeof profileSchema>) => api.updateProfile(v), { success: 'Profile updated' })
  if (!me) return <AppScreen><Skeleton className="h-40" /></AppScreen>
  return (
    <AppScreen footer={<Button arrow loading={save.isPending} onClick={form.handleSubmit((v) => save.mutate(v, { onSuccess: () => navigate('/account') }))}>Save</Button>}>
      <ScreenTitle title="Your Profile" subtitle="How you appear to suppliers and your team." />
      <Input label="Full name" autoComplete="name" error={form.formState.errors.fullName?.message} {...form.register('fullName')} />
      <Input label="Email" value={me.profile.email} disabled hint="Contact support to change your login email." />
      <Input label="Phone" type="tel" autoComplete="tel" error={form.formState.errors.phone?.message} {...form.register('phone')} />
    </AppScreen>
  )
}

const companySchema = z.object({
  name: z.string().trim().min(2, 'Enter your company name'),
  abn: z.string().refine(isValidAbn, 'Enter a valid 11-digit ABN'),
  contactName: z.string().trim().min(2, 'Enter a contact name'),
  email: z.email('Enter a valid email'),
  phone: phoneSchema,
  address: z.string().trim().min(5, 'Enter your business address'),
})

export function CompanyPage() {
  const { data: me } = useMe()
  const org = me?.org
  const canEdit = me?.role === 'owner'
  const form = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    values: org ? { name: org.name, abn: org.abn, contactName: org.contactName, email: org.email, phone: org.phone, address: org.address } : undefined,
  })
  const save = useApiMutation((api, v: z.infer<typeof companySchema>) => api.updateOrganisation({ ...v, abn: formatAbn(v.abn) }), { success: 'Company details saved' })
  if (!org) return <AppScreen><Skeleton className="h-40" /></AppScreen>
  const e = form.formState.errors
  return (
    <AppScreen footer={canEdit ? <Button arrow loading={save.isPending} onClick={form.handleSubmit((v) => save.mutate(v))}>Save Changes</Button> : undefined}>
      <ScreenTitle title="Company Details" subtitle={canEdit ? 'Shown on bookings and invoices.' : 'Only the owner can change these details.'} />
      <fieldset disabled={!canEdit}>
        <Input label="Company name" error={e.name?.message} {...form.register('name')} />
        <Controller control={form.control} name="abn" render={({ field }) => <Input label="ABN" inputMode="numeric" value={field.value} onChange={(ev) => field.onChange(formatAbn(ev.target.value))} valid={isValidAbn(field.value)} error={e.abn?.message} />} />
        <Input label="Contact name" error={e.contactName?.message} {...form.register('contactName')} />
        <Input label="Business email" type="email" error={e.email?.message} {...form.register('email')} />
        <Input label="Phone" type="tel" error={e.phone?.message} {...form.register('phone')} />
        <Controller control={form.control} name="address" render={({ field }) => <AddressAutocomplete label="Business address" value={field.value} onChange={field.onChange} onSelect={(p) => field.onChange(p.label)} error={e.address?.message} />} />
      </fieldset>
    </AppScreen>
  )
}

export function PaymentSettingsPage() {
  const { data: me } = useMe()
  const methods = usePaymentMethods()
  const sub = useSubscription()
  const isSupplier = !!me && areaFor(me) === 'supplier'
  const payouts = usePayoutSummary()

  if (isSupplier)
    return (
      <AppScreen>
        <ScreenTitle title="Payout Settings" subtitle="Where we send your earnings." />
        <Card className="flex items-center gap-3">
          <Landmark className="size-8 text-[#dae4ef]" strokeWidth={1.4} aria-hidden />
          <div className="flex-1 text-sm">
            <p className="text-base font-semibold">{me?.org?.name}</p>
            <p className="text-muted">BSB ••• ••1 · Account •••• 4821</p>
          </div>
        </Card>
        <p className="mt-2 text-xs text-muted">Payouts are sent within 2 business days of a request. SiteRun keeps a 10% service fee from each completed hire.</p>
        <SectionLabel>Balance</SectionLabel>
        <ListRow to="/supplier/payouts" title={payouts.data ? formatMoney(payouts.data.availableCents, { cents: true }) : '…'} subtitle="Available for payout" />
      </AppScreen>
    )

  return (
    <AppScreen>
      <ScreenTitle title="Payment Settings" subtitle="Cards, plan and SiteCredits." />
      <SectionLabel action={<Link to="/payments">Manage</Link>}>Cards</SectionLabel>
      <div className="space-y-2">
        {methods.data?.map((m) => (
          <Card key={m.id} className="flex items-center gap-3 py-3">
            <BrandMark brand={m.brand} />
            <span className="flex-1 text-sm">
              •••• {m.last4} · {String(m.expMonth).padStart(2, '0')}/{String(m.expYear).slice(-2)}
            </span>
            {m.isDefault && <span className="text-xs text-primary">Default</span>}
          </Card>
        ))}
        <ListRow to="/payments/cards/new" title="Add Card" />
      </div>
      <SectionLabel action={<Link to="/plans">Change</Link>}>Plan</SectionLabel>
      <Card>
        {sub.data?.status === 'active' ? (
          <>
            <p className="text-base font-semibold capitalize">
              {sub.data.plan} · {sub.data.period}
            </p>
            {sub.data.renewsAt && <p className="text-sm text-muted">Renews {formatDate(sub.data.renewsAt)}</p>}
          </>
        ) : (
          <Link to="/plans" className="flex items-center justify-between text-sm text-primary">
            Choose a plan <ChevronRight className="size-4" />
          </Link>
        )}
      </Card>
      <SectionLabel>SiteCredits</SectionLabel>
      <Card>
        <p className="font-display text-2xl font-bold">{(sub.data?.creditsBalance ?? 0).toLocaleString('en-AU')}</p>
        <p className="text-sm text-muted">Credits are applied to hires before your card.</p>
      </Card>
    </AppScreen>
  )
}

const pwSchema = z.object({ password: passwordSchema, confirm: z.string() }).refine((v) => v.password === v.confirm, { message: 'Passwords don’t match', path: ['confirm'] })

function readPrefs() {
  try {
    return JSON.parse(localStorage.getItem('siterun-prefs') ?? '{}') as Record<string, boolean>
  } catch {
    return {}
  }
}

export function PrivacyPage() {
  const navigate = useNavigate()
  const form = useForm<z.infer<typeof pwSchema>>({ resolver: zodResolver(pwSchema), defaultValues: { password: '', confirm: '' } })
  const password = useWatch({ control: form.control, name: 'password' })
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => ({ email: true, sms: true, marketing: false, ...readPrefs() }))
  const update = useApiMutation((api, pw: string) => api.updatePassword(pw), { success: 'Password changed' })
  const deletion = useApiMutation(
    (api) => api.createTicket({ subject: 'Account deletion request', category: 'Privacy', description: 'Please delete my account and personal data.' }),
    { success: 'Request received. We’ll confirm by email within 30 days.' },
  )
  const setPref = (k: string, v: boolean) => {
    const next = { ...prefs, [k]: v }
    setPrefs(next)
    try {
      localStorage.setItem('siterun-prefs', JSON.stringify(next))
    } catch {
      // storage unavailable
    }
  }

  return (
    <AppScreen>
      <ScreenTitle title="Privacy & Security" subtitle="Your data and preferences." />
      <SectionLabel>Change password</SectionLabel>
      <form onSubmit={form.handleSubmit((v) => update.mutate(v.password, { onSuccess: () => form.reset() }))} noValidate>
        <PasswordInput label="New password" autoComplete="new-password" error={form.formState.errors.password?.message} {...form.register('password')} />
        <PasswordChecklist value={password} />
        <PasswordInput label="Confirm password" autoComplete="new-password" error={form.formState.errors.confirm?.message} {...form.register('confirm')} />
        <Button type="submit" variant="secondary" size="md" block loading={update.isPending}>
          Update Password
        </Button>
      </form>
      <SectionLabel>Notifications</SectionLabel>
      <div className="space-y-2">
        <ToggleRow title="Email updates" description="Bookings, invoices and documents" checked={prefs.email ?? true} onChange={(v) => setPref('email', v)} />
        <ToggleRow title="SMS alerts" description="Deliveries and collections" checked={prefs.sms ?? true} onChange={(v) => setPref('sms', v)} />
        <ToggleRow title="Product news" description="Occasional updates from SiteRun" checked={prefs.marketing ?? false} onChange={(v) => setPref('marketing', v)} />
      </div>
      <SectionLabel>Your data</SectionLabel>
      <div className="space-y-2">
        <ListRow to="/privacy" title="Privacy Policy" subtitle="How we handle your information" />
        <Button variant="danger" size="md" block loading={deletion.isPending} onClick={() => window.confirm('Request deletion of your account and data?') && deletion.mutate(undefined, { onSuccess: () => navigate('/support') })}>
          Request Account Deletion
        </Button>
      </div>
    </AppScreen>
  )
}
