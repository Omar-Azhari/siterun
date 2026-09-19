import { expect, test, type Browser, type Page } from '@playwright/test'
import { addDays, format } from 'date-fns'

// End-to-end flows against the Supabase project in .env, using the seeded demo
// accounts (supabase/seed.sql). Each run creates its own bookings and listings on
// dates far enough ahead that runs don't collide.
const PASSWORD = 'SiteRun!2026'
const ALEX = 'alex@acme.test'
const JORDAN = 'jordan@turnerplant.test'
const ADMIN = 'admin@siterun.test'

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Log In' }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

async function as(browser: Browser, email: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await login(page, email)
  return page
}

const day = (offset: number) => format(addDays(new Date(), offset), 'yyyy-MM-dd')
// A random window 1–3 years out keeps repeated runs off each other's dates.
const offset = 400 + Math.floor(Math.random() * 700)

test.describe.serial('contractor books, supplier accepts', () => {
  let bookingId = ''

  test('search → book → supplier accepts → contractor sees confirmation', async ({ browser }) => {
    const alex = await as(browser, ALEX)
    await alex.goto(`/search/results?q=Tilt%20Bucket&start=${day(offset)}&end=${day(offset + 2)}`)
    await alex
      .getByRole('link', { name: /Tilt Bucket/ })
      .first()
      .click()
    await alex.getByRole('button', { name: 'Book Now' }).click()
    await expect(alex.getByLabel('Start date')).toHaveValue(day(offset))
    await alex.getByRole('button', { name: 'Continue' }).click()
    await expect(alex.getByRole('heading', { name: 'Booking Requested!' })).toBeVisible()
    bookingId = alex.url().match(/bookings\/([^/]+)\/confirmed/)?.[1] ?? ''
    expect(bookingId).not.toBe('')

    const jordan = await as(browser, JORDAN)
    await jordan.goto(`/supplier/bookings/${bookingId}`)
    await jordan.getByRole('button', { name: 'Accept' }).click()
    await expect(jordan.getByRole('button', { name: 'Mark Picked Up' })).toBeVisible()

    await alex.goto(`/bookings/${bookingId}/confirmed`)
    await expect(alex.getByRole('heading', { name: 'Booking Confirmed!' })).toBeVisible()
  })

  test('contractor extends the hire', async ({ browser }) => {
    const alex = await as(browser, ALEX)
    await alex.goto(`/hires/${bookingId}/extend`)
    await alex
      .getByRole('radiogroup', { name: 'Extension length' })
      .getByRole('radio')
      .first()
      .click()
    await alex.getByRole('button', { name: 'Confirm Extension' }).click()
    await expect(alex).toHaveURL(new RegExp(`/hires/${bookingId}$`))
    await alex.goto(`/bookings/${bookingId}`)
    await expect(
      alex.getByText(format(addDays(new Date(), offset + 2), 'd MMM')).first(),
    ).toBeHidden()
  })

  test('contractor and supplier message each other', async ({ browser }) => {
    const text = `Gate code is ${Math.floor(1000 + Math.random() * 9000)}`
    const alex = await as(browser, ALEX)
    await alex.goto(`/bookings/${bookingId}`)
    await alex
      .getByRole('button', { name: /message/i })
      .first()
      .click()
    await expect(alex).toHaveURL(/\/messages\//)
    const conversation = alex.url()
    await alex.getByPlaceholder('Type a message...').fill(text)
    await alex.getByRole('button', { name: 'Send message' }).click()
    await expect(alex.getByRole('list', { name: 'Messages' }).getByText(text)).toBeVisible()

    const jordan = await as(browser, JORDAN)
    await jordan.goto(new URL(conversation).pathname)
    await expect(jordan.getByText(text)).toBeVisible()
    const reply = `Thanks, ${text.slice(-4)} noted`
    await jordan.getByPlaceholder('Type a message...').fill(reply)
    await jordan.getByRole('button', { name: 'Send message' }).click()
    // Realtime: the reply shows up for the contractor without a reload.
    await expect(alex.getByText(reply)).toBeVisible({ timeout: 15_000 })
  })
})

test('supplier lists a machine, uploads documents, admin approves, machine appears in search', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const make = `E2E${Date.now().toString(36).toUpperCase()}`
  const jordan = await as(browser, JORDAN)

  await jordan.goto('/supplier/machines/new/category')
  await jordan.getByRole('button', { name: /Generators/ }).click()
  await expect(jordan).toHaveURL(/edit\/details/)
  const machineId = jordan.url().match(/machines\/([^/]+)\/edit/)?.[1] ?? ''

  await jordan.getByLabel('Make *').fill(make)
  await jordan.getByLabel('Model *').fill('QAS 60')
  await jordan.getByLabel('Year *').selectOption({ index: 2 })
  await jordan.getByLabel('Serial number *').fill(`SN${make}`)
  await jordan.getByRole('button', { name: 'Continue' }).click()

  await expect(jordan).toHaveURL(/edit\/photos/)
  await jordan.locator('input[type=file]').setInputFiles('public/images/generator-white-sm.webp')
  await expect(jordan.getByRole('button', { name: 'Delete photo 1' })).toBeVisible({
    timeout: 20_000,
  })
  await jordan.getByRole('button', { name: 'Continue' }).click()

  await expect(jordan).toHaveURL(/edit\/specs/)
  for (const input of await jordan
    .locator('main input[inputmode="decimal"], main input[type="text"]')
    .all()) {
    if (!(await input.inputValue())) await input.fill('60')
  }
  await jordan.getByRole('button', { name: 'Continue' }).click()

  await expect(jordan).toHaveURL(/edit\/rates/)
  await jordan.getByRole('tab', { name: 'Daily' }).click()
  await jordan.getByLabel(/Hourly rate/).fill('30')
  await jordan.getByLabel(/Daily rate/).fill('180')
  await jordan.getByRole('button', { name: 'Continue' }).click()

  await expect(jordan).toHaveURL(/edit\/service-area/)
  await jordan.getByRole('button', { name: 'Create Listing' }).click()
  await expect(jordan).toHaveURL(/compliance/)

  for (const type of ['req-insurance', 'req-service', 'req-registration']) {
    await jordan.goto(`/supplier/compliance/upload?machine=${machineId}&type=${type}`)
    await jordan.locator('input[type=file]').setInputFiles({
      name: `${type}.pdf`,
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n% SiteRun e2e test document\n'),
    })
    await jordan.getByLabel('Expiry date').fill(day(365))
    await jordan.getByRole('button', { name: 'Upload Document' }).click()
    await expect(jordan).not.toHaveURL(/compliance\/upload/)
  }

  await jordan.goto(`/supplier/machines/${machineId}/review`)
  await jordan.getByRole('button', { name: 'Submit for Approval' }).click()
  await expect(jordan).toHaveURL(/\/supplier\/machines$/)

  const admin = await as(browser, ADMIN)
  await admin.goto(`/admin/approvals/machines/${machineId}`)
  for (let i = 0; i < 3; i++) {
    await admin.getByRole('button', { name: 'Verify', exact: true }).first().click()
    await expect(admin.getByRole('button', { name: 'Verify', exact: true })).toHaveCount(2 - i)
  }
  await admin.getByRole('button', { name: 'Approve' }).click()
  await expect(admin).toHaveURL(/\/admin\/approvals$/)

  const alex = await as(browser, ALEX)
  await alex.goto(`/search/results?q=${make}`)
  await expect(alex.getByRole('link', { name: new RegExp(make) })).toBeVisible()
})

test('a non-admin is kept out of the admin area', async ({ browser }) => {
  const alex = await as(browser, ALEX)
  await alex.goto('/admin')
  await expect(alex).not.toHaveURL(/\/admin/)
})
