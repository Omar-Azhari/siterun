import { expect, test, type Page } from '@playwright/test'

// Launch features on the demo backend: live GPS sharing, the crash screen and error
// reports, and the legal pages.
const PASSWORD = 'SiteRun!2026'

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Log In' }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

async function signOut(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('siterun-demo-session')
    sessionStorage.removeItem('siterun-demo-session')
  })
}

test.describe('live GPS', () => {
  test.use({
    geolocation: { latitude: -37.72, longitude: 144.9, accuracy: 12 },
    permissions: ['geolocation'],
  })

  test('the driver shares live location and the customer sees it', async ({ page }) => {
    await login(page, 'jordan@turnerplant.test')
    await page.goto('/supplier/bookings/b-crane-buildco')
    await page.getByRole('button', { name: 'Mark Dispatched' }).click()
    await page.getByRole('button', { name: 'Share Live Location' }).click()
    await expect(page.getByText(/Sharing with the customer · sent/)).toBeVisible()
    await page.getByRole('button', { name: 'Stop Sharing' }).click()
    await expect(page.getByRole('button', { name: 'Share Live Location' })).toBeVisible()

    await signOut(page)
    await login(page, 'priya@buildco.test')
    await page.goto('/hires/b-crane-buildco/tracking')
    await expect(page.getByText(/Live GPS · updated/)).toBeVisible()
  })

  test('sharing is refused when location access is off', async ({ page, context }) => {
    await context.clearPermissions()
    await login(page, 'jordan@turnerplant.test')
    await page.goto('/supplier/bookings/b-crane-buildco')
    await page.getByRole('button', { name: 'Mark Dispatched' }).click()
    await page.getByRole('button', { name: 'Share Live Location' }).click()
    await expect(page.getByText(/Location access is off/)).toBeVisible()
  })
})

test('the legal pages carry the full terms and privacy policy', async ({ page }) => {
  await page.goto('/terms')
  await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Australian Consumer Law' })).toBeVisible()
  await page.goto('/privacy')
  await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Overseas disclosure' })).toBeVisible()
  await expect(page.getByText(/oaic\.gov\.au/)).toBeVisible()
})

test('uncaught errors reach the admin error list', async ({ page }) => {
  await login(page, 'admin@siterun.test')
  // Demo reports live in memory, so stay on one page load: navigate inside the app.
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error('e2e: deliberate crash')
    })
  })
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: /App errors/ }).click()
  await expect(page.getByText('e2e: deliberate crash', { exact: true })).toBeVisible()
})

test.describe('platform admin tools', () => {
  test.beforeEach(async ({ page }) => login(page, 'admin@siterun.test'))

  test('an admin can change and then cancel a hire', async ({ page }) => {
    await page.goto('/admin/bookings')
    await page.getByRole('link', { name: /SR-/ }).first().click()
    await expect(page).toHaveURL(/\/admin\/bookings\/[^/]+$/)

    await page.getByRole('button', { name: 'Change Dates or Total' }).click()
    const sheet = page.getByRole('dialog')
    await sheet.getByLabel('New total (ex. GST)').fill('1234')
    await sheet.getByLabel(/Why is it being changed/).fill('Agreed after a dispute')
    await sheet.getByRole('button', { name: 'Save Change' }).click()
    await expect(page.getByText('$1,234 ex. GST')).toBeVisible()

    await page.getByRole('button', { name: 'Cancel Hire' }).click()
    await page
      .getByRole('dialog')
      .getByLabel(/Why is it being cancelled/)
      .fill('Machine broke down')
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel Hire' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByText('Cancelled').first()).toBeVisible()
    // The page's own button, not the sheet's: cancelling twice isn't possible.
    await expect(page.getByRole('button', { name: 'Cancel Hire' }).first()).toBeDisabled()
  })

  test('the analytics screen shows the funnel', async ({ page }) => {
    await page.goto('/admin/more')
    await page.getByRole('link', { name: /Analytics/ }).click()
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
    await expect(page.getByText('Searches').first()).toBeVisible()
    await expect(page.getByText('Machines viewed')).toBeVisible()
    await page.getByRole('tab', { name: '7 days' }).click()
    await expect(page.getByText('View → booking')).toBeVisible()
  })
})

test('email updates can be turned off from the account', async ({ page }) => {
  await login(page, 'alex@acme.test')
  await page.goto('/account/privacy')
  const toggle = page.getByRole('switch', { name: /Email updates/ })
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
})
