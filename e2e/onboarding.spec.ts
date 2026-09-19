import { expect, test } from '@playwright/test'

// Runs on the in-browser demo backend (see playwright.config.ts): Supabase sends real
// verification emails, so the 6-digit code step can only be automated here.
test('sign up, verify, business profile and first site', async ({ page }) => {
  const email = `e2e.${Date.now()}@acme.test`
  await page.goto('/signup/role')
  await page.getByRole('radio', { name: /contractor/i }).click()
  await page.getByRole('button', { name: /continue/i }).click()

  await page.getByLabel('Full name').fill('Riley Morgan')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Phone number').fill('412 555 019')
  await page.getByLabel('Password', { exact: true }).fill('Harbour!2026x')
  await page.getByRole('button', { name: /create account/i }).click()

  await expect(page.getByRole('heading', { name: 'Verify your account' })).toBeVisible()
  await page.getByRole('textbox').first().click()
  await page.keyboard.type('123456')
  await expect(page).toHaveURL(/onboarding\/business/)
  // The form fills in contact details from the profile once it loads.
  await expect(page.getByLabel('Contact name')).toHaveValue('Riley Morgan')

  await page.getByLabel('Company name').fill('Morgan Civil Pty Ltd')
  await page.getByLabel('ABN').fill('53 004 085 616')
  await page.getByLabel('Contact name').fill('Riley Morgan')
  await page.getByLabel('Business email').fill(email)
  await page.getByLabel('Business address').fill('12 Smith St, Fitzroy VIC 3065')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Complete Setup' }).click()
  await expect(page).not.toHaveURL(/onboarding/)

  await page.goto('/sites/new/location')
  await page.getByLabel('Search address or suburb').fill('Fitzroy')
  await page.getByRole('option').first().click()
  await page.getByRole('button', { name: 'Confirm Location' }).click()
  await page.getByLabel('Site name').fill('Brunswick St Apartments')
  await page.getByLabel('Project type').selectOption({ index: 1 })
  await page
    .getByLabel('Start date')
    .fill(new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10))
  await page.getByLabel('Expected duration').selectOption({ index: 1 })
  await page.getByRole('button', { name: /continue/i }).click()
  await page.getByPlaceholder('Contact name').fill('Riley Morgan')
  await page.getByLabel('Contact phone').fill('412 555 019')
  await page.getByRole('button', { name: /create site|save|continue/i }).click()
  await expect(page).toHaveURL(/team\/invite/)

  await page.goto('/sites')
  await expect(page.getByText('Brunswick St Apartments')).toBeVisible()
})

test('non-admins cannot open the admin area', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('alex@acme.test')
  await page.getByLabel('Password', { exact: true }).fill('SiteRun!2026')
  await page.getByRole('button', { name: 'Log In' }).click()
  await expect(page).toHaveURL(/\/home/)
  await page.goto('/admin')
  await expect(page).not.toHaveURL(/\/admin/)
})
