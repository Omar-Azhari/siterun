import { expect, test, type Page } from '@playwright/test'

// Phase 5 checkpoint: key screens at phone, tablet and desktop widths (demo backend).
const WIDTHS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
]

const SCREENS: { name: string; path: string; as?: string; ready: string }[] = [
  { name: 'landing', path: '/', ready: 'Keep projects moving' },
  { name: 'login', path: '/login', ready: 'Welcome back' },
  { name: 'contractor-home', path: '/home', as: 'alex@acme.test', ready: 'Browse Equipment' },
  {
    name: 'search-results',
    path: '/search/results?category=excavators',
    as: 'alex@acme.test',
    ready: 'Excavators',
  },
  { name: 'payments', path: '/payments', as: 'alex@acme.test', ready: 'Payments' },
  {
    name: 'supplier-home',
    path: '/supplier',
    as: 'jordan@turnerplant.test',
    ready: 'Home',
  },
  { name: 'admin-dashboard', path: '/admin', as: 'admin@siterun.test', ready: 'Dashboard' },
]

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('SiteRun!2026')
  await page.getByRole('button', { name: 'Log In' }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

for (const w of WIDTHS) {
  test.describe(`${w.name}px`, () => {
    test.use({ viewport: { width: w.width, height: w.height } })
    for (const s of SCREENS) {
      test(s.name, async ({ page }) => {
        if (s.as) await signIn(page, s.as)
        await page.goto(s.path)
        await expect(page.getByRole('heading', { name: s.ready }).first()).toBeVisible()
        await page.waitForLoadState('networkidle')
        await page.screenshot({
          path: `docs/checkpoints/phase-5/${s.name}-${w.name}.png`,
          fullPage: false,
        })
      })
    }
  })
}
