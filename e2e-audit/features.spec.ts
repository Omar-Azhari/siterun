import { expect, test, type Page } from '@playwright/test'
import { addDays, format } from 'date-fns'

// Audit pass 2: every feature that changes data, on the Supabase build. Each test is
// independent; the database is restored from private.audit_baseline afterwards.
const PASSWORD = 'SiteRun!2026'
const day = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd')
const ID = {
  hireOnSite: 'fd42c32f-c158-4769-ada7-0a0440139ca5',
  requested: 'a94fbf00-00c1-4d9f-a807-f35eb093dadd',
  site: '0b2c8ece-4fea-4dff-ab03-61a4c574c6bf',
  conv: '9bd9a891-9515-4aac-a1a3-64bd58e01e30',
  metroRequest: '205002ab-4356-4cfa-a13a-88b4205a4a33',
  apexConfirmed: 'a3641771-8b8e-4d04-aa82-e976d8771fb6',
  liveMachine: '858b505f-5fdd-444d-a1fe-4fa911ff4f54',
  pendingMachine: '89108e22-6a56-4e01-aab9-19639fb94330',
  pendingDoc: '0babcb8c-da14-4c2e-a123-cefe8ac84630',
}

function watch(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`crash: ${e.message}`))
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().includes('supabase.co') && !r.url().includes('/auth/v1/user'))
      errors.push(`http ${r.status()} ${r.url().split('.co')[1]?.slice(0, 120)}`)
  })
  return errors
}

async function login(page: Page, email: string, keep = true) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  if (!keep) await page.getByText('Keep me signed in').click()
  await page.getByRole('button', { name: 'Log In' }).click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
}

const noErrors = (errors: string[]) => expect(errors, errors.join('\n')).toEqual([])
const toast = (page: Page, text: RegExp | string) =>
  expect(page.getByText(text).first()).toBeVisible({ timeout: 10_000 })

test.describe('contractor', () => {
  test.beforeEach(async ({ page }) => login(page, 'alex@acme.test'))

  test('create a site', async ({ page }) => {
    const errors = watch(page)
    await page.goto('/sites/new/location')
    await page.getByLabel('Search address or suburb').fill('Fitzroy')
    await page.getByRole('option').first().click()
    await page.getByRole('button', { name: 'Confirm Location' }).click()
    await page.getByLabel('Site name').fill('Audit Test Site')
    await page.getByLabel('Project type').selectOption({ index: 1 })
    await page.getByLabel('Start date').fill(day(7))
    await page.getByLabel('Expected duration').selectOption({ index: 1 })
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByPlaceholder('Contact name').fill('Alex Turner')
    await page.getByLabel('Contact phone').fill('412 345 678')
    await page.getByRole('button', { name: /create site|save|continue/i }).click()
    await expect(page).toHaveURL(/team\/invite/)
    await page.goto('/sites')
    await expect(page.getByText('Audit Test Site')).toBeVisible()
    noErrors(errors)
  })

  test('edit a site', async ({ page }) => {
    const errors = watch(page)
    await page.goto(`/sites/${ID.site}/edit`)
    await page.getByLabel(/Access notes/).fill('Audit note')
    await page.getByRole('button', { name: /save/i }).click()
    await toast(page, 'Site updated')
    noErrors(errors)
  })

  test('invite a team member and change a role', async ({ page }) => {
    const errors = watch(page)
    await page.goto('/team/invite')
    await page.getByPlaceholder('Enter email address').fill('audit.invite@acme.test')
    await page.getByRole('button', { name: 'Add to invite list' }).click()
    await page.getByRole('button', { name: 'Send Invitations' }).click()
    await page.waitForTimeout(2000)
    await page.goto('/team')
    await expect(page.getByText('audit.invite@acme.test')).toBeVisible()
    noErrors(errors)
  })

  test('plans: change plan and buy SiteCredits', async ({ page }) => {
    const errors = watch(page)
    await page.goto('/plans')
    await page.getByRole('radiogroup', { name: 'Plan' }).getByRole('radio').first().click()
    await page
      .getByRole('radiogroup', { name: 'SiteCredits pack' })
      .getByRole('radio')
      .first()
      .click()
    await page
      .getByRole('button', { name: /continue|subscribe|confirm|pay/i })
      .last()
      .click()
    await page.waitForTimeout(2500)
    noErrors(errors)
  })

  test('add a card, then remove it', async ({ page }) => {
    const errors = watch(page)
    await page.goto('/payments/cards/new')
    await page.getByLabel('Card number').fill('4000 0566 5566 5556')
    await page.getByLabel('Name on card').fill('Alex Turner')
    await page.getByLabel('Expiry').fill('08/30')
    await page.getByLabel('CVC').fill('123')
    await page.getByRole('button', { name: 'Save Card' }).click()
    await expect(page).toHaveURL(/\/payments$/)
    await expect(page.getByText('5556').first()).toBeVisible()
    await page.getByRole('button', { name: /ending in 5556/ }).click()
    await page.getByRole('button', { name: 'Remove Card' }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByText('5556')).toHaveCount(0)
    noErrors(errors)
  })

  test('make a payment', async ({ page }) => {
    const errors = watch(page)
    await page.goto('/payments')
    await page.getByRole('button', { name: 'Make a Payment' }).click()
    await page.getByRole('button', { name: /^pay/i }).last().click()
    await page.waitForTimeout(2500)
    await page.goto('/payments')
    await expect(page.getByText('$0.00')).toBeVisible()
    noErrors(errors)
  })

  test('download an invoice PDF', async ({ page }) => {
    const errors = watch(page)
    await page.goto('/invoices')
    const download = page.waitForEvent('download', { timeout: 20_000 })
    await page
      .getByRole('button', { name: /download/i })
      .first()
      .click()
    expect((await download).suggestedFilename()).toMatch(/\.pdf$/)
    noErrors(errors)
  })

  test('cancel a requested booking', async ({ page }) => {
    const errors = watch(page)
    await page.goto(`/bookings/${ID.requested}`)
    await page.getByRole('button', { name: 'Cancel Booking' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel Booking' }).click()
    await expect(page.getByText(/cancelled/i).first()).toBeVisible()
    noErrors(errors)
  })

  test('schedule a return', async ({ page }) => {
    const errors = watch(page)
    await page.goto(`/hires/${ID.hireOnSite}/return`)
    await page.getByLabel('Preferred collection date').fill(day(3))
    await page
      .getByRole('radiogroup', { name: 'Collection time' })
      .getByRole('radio')
      .first()
      .click()
    await page
      .getByRole('button', { name: /schedule|confirm|request/i })
      .last()
      .click()
    await expect(page).not.toHaveURL(/\/return$/)
    noErrors(errors)
  })

  test('smart swap', async ({ page }) => {
    const errors = watch(page)
    await page.goto(`/hires/${ID.hireOnSite}/swap`)
    await page.getByRole('radiogroup', { name: 'Swap option' }).getByRole('radio').nth(1).click()
    await page
      .getByRole('button', { name: /swap|confirm|request/i })
      .last()
      .click()
    await expect(page).not.toHaveURL(/\/swap$/)
    noErrors(errors)
  })

  test('notifications: mark all read', async ({ page }) => {
    const errors = watch(page)
    await page.goto('/notifications')
    await page.getByRole('button', { name: /mark all/i }).click()
    await page.waitForTimeout(1500)
    await expect(page.getByLabel('Unread')).toHaveCount(0)
    noErrors(errors)
  })

  test('support ticket', async ({ page }) => {
    const errors = watch(page)
    await page.goto('/support/new')
    await page.getByLabel('Category').selectOption({ index: 1 })
    await page.getByLabel('Subject').fill('Audit ticket')
    await page.getByLabel('Details').fill('Checking the support form works.')
    await page.getByRole('button', { name: 'Submit Request' }).click()
    await expect(page).toHaveURL(/support\/requests/)
    await expect(page.getByText('Audit ticket')).toBeVisible()
    noErrors(errors)
  })

  test('profile and company edits', async ({ page }) => {
    const errors = watch(page)
    await page.goto('/account/profile')
    await page.getByLabel('Phone').fill('412 345 679')
    await page.getByRole('button', { name: /^save/i }).click()
    await toast(page, /saved|updated/i)
    await page.goto('/account/company')
    await page.getByLabel('Contact name').fill('Alex Turner')
    await page.getByRole('button', { name: /^save/i }).click()
    await toast(page, /saved|updated/i)
    noErrors(errors)
  })

  test('message with an attachment', async ({ page }) => {
    const errors = watch(page)
    await page.goto(`/messages/${ID.conv}`)
    await page.locator('input[type=file]').setInputFiles({
      name: 'site-plan.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n% audit\n'),
    })
    await page.getByPlaceholder('Type a message...').fill('Site plan attached')
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(page.getByText('site-plan.pdf').first()).toBeVisible()
    noErrors(errors)
  })
})

test('contractor: change password and log back in', async ({ page }) => {
  const errors = watch(page)
  await login(page, 'priya@buildco.test')

  // Each change is checked against the auth response, not a toast: a silently rejected
  // change would leave this account locked out of every later test.
  const setPassword = async (pw: string) => {
    await page.goto('/account/privacy')
    await page.getByLabel('New password').fill(pw)
    await page.getByLabel('Confirm password').fill(pw)
    const saved = page.waitForResponse(
      (r) => r.url().includes('/auth/v1/user') && r.request().method() === 'PUT',
      { timeout: 15_000 },
    )
    await page.getByRole('button', { name: 'Update Password' }).click()
    const res = await saved
    expect(res.ok(), `password change failed: ${res.status()} ${await res.text()}`).toBe(true)
    await toast(page, /password/i)
  }

  try {
    await setPassword('SiteRun!2026x')
  } finally {
    await setPassword(PASSWORD)
  }

  // Prove the seeded password is back: sign in again with no stored session.
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await login(page, 'priya@buildco.test')
  noErrors(errors)
})

test('auth: keep me signed in off stores the session for this tab only', async ({ page }) => {
  await login(page, 'alex@acme.test', false)
  const where = await page.evaluate(() => ({
    local: Object.keys(localStorage).some((k) => k.endsWith('-auth-token')),
    session: Object.keys(sessionStorage).some((k) => k.endsWith('-auth-token')),
  }))
  expect(where).toEqual({ local: false, session: true })
})

test.skip('auth: forgot password', async ({ page }) => {
  const errors = watch(page)
  await page.goto('/forgot-password')
  await page.getByLabel(/email/i).fill('alex@acme.test')
  await page.getByRole('button', { name: /send|reset/i }).click()
  await expect(page.getByText(/check your email|sent/i).first()).toBeVisible()
  noErrors(errors)
})

test.skip('auth: sign up on Supabase', async ({ page }) => {
  const errors = watch(page)
  await page.goto('/signup/role')
  await page.getByRole('radio', { name: /contractor/i }).click()
  await page.getByRole('button', { name: /continue/i }).click()
  await page.getByLabel('Full name').fill('Audit User')
  await page.getByLabel('Email address').fill(`audit.signup.${Date.now()}@acme.test`)
  await page.getByLabel('Phone number').fill('412 555 019')
  await page.getByLabel('Password', { exact: true }).fill('Harbour!2026x')
  await page.getByRole('button', { name: /create account/i }).click()
  await expect(page.getByRole('heading', { name: 'Verify your account' })).toBeVisible()
  noErrors(errors)
})

test.describe('supplier', () => {
  test.beforeEach(async ({ page }) => login(page, 'jordan@turnerplant.test'))

  test('decline a request', async ({ page }) => {
    const errors = watch(page)
    await page.goto(`/supplier/bookings/${ID.metroRequest}`)
    await page.getByRole('button', { name: 'Decline' }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /decline/i })
      .last()
      .click()
    await expect(page.getByText(/declined/i).first()).toBeVisible()
    noErrors(errors)
  })

  test('dispatch, deliver and collect (invoice raised)', async ({ page }) => {
    const errors = watch(page)
    await page.goto(`/supplier/bookings/${ID.apexConfirmed}`)
    await page.getByRole('button', { name: 'Mark Dispatched' }).click()
    await page.getByRole('button', { name: 'Mark Delivered' }).click()
    await page.getByRole('button', { name: /Mark Collected/ }).click()
    await expect(page.getByText(/completed/i).first()).toBeVisible()
    noErrors(errors)
  })

  test('request a payout', async ({ page }) => {
    const errors = watch(page)
    await page.goto('/supplier/payouts')
    await page.getByRole('button', { name: /request payout/i }).click()
    await expect(page.getByRole('button', { name: /request payout/i })).toBeDisabled({
      timeout: 10_000,
    })
    noErrors(errors)
  })

  test('pause and resume a listing', async ({ page }) => {
    const errors = watch(page)
    await page.goto(`/supplier/machines/${ID.liveMachine}`)
    await page.getByRole('button', { name: /pause/i }).click()
    await page.getByRole('button', { name: 'Make Live Again' }).click()
    await expect(page.getByRole('button', { name: /pause/i })).toBeVisible()
    noErrors(errors)
  })
})

test('operator uploads a document', async ({ page }) => {
  const errors = watch(page)
  await login(page, 'sam@turnerplant.test')
  await page.goto('/operator/documents')
  await page
    .getByRole('link', { name: /upload|add|operator tickets/i })
    .first()
    .click()
  await page.locator('input[type=file]').setInputFiles({
    name: 'ticket.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n% audit\n'),
  })
  await page
    .getByLabel('Document type')
    .selectOption({ index: 1 })
    .catch(() => {})
  await page.getByRole('button', { name: 'Upload Document' }).click()
  await expect(page).not.toHaveURL(/upload/)
  noErrors(errors)
})

test.describe('platform admin', () => {
  test.beforeEach(async ({ page }) => login(page, 'admin@siterun.test'))

  test('reject a document', async ({ page }) => {
    const errors = watch(page)
    await page.goto(`/admin/approvals/documents/${ID.pendingDoc}`)
    await page.getByRole('button', { name: 'Reject' }).click()
    await page.getByRole('dialog').getByRole('textbox').fill('Certificate is out of date.')
    await page.getByRole('button', { name: 'Send Rejection' }).click()
    await page.waitForTimeout(1500)
    noErrors(errors)
  })

  test('reject a listing', async ({ page }) => {
    const errors = watch(page)
    await page.goto(`/admin/approvals/machines/${ID.pendingMachine}`)
    // The pending documents each have their own Reject; the listing's is the last one,
    // in the sticky footer after the page content.
    await page.getByRole('button', { name: 'Reject', exact: true }).last().click()
    const sheet = page.getByRole('dialog')
    await expect(sheet.getByText('Reject listing')).toBeVisible()
    await sheet.getByRole('textbox').fill('Photos are too dark.')
    await page.getByRole('button', { name: 'Send Rejection' }).click()
    await expect(page).toHaveURL(/\/admin\/approvals$/, { timeout: 15_000 })
    noErrors(errors)
  })
})
