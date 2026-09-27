import { expect, test, type Page } from '@playwright/test'

/**
 * Store screenshots, taken from the real app on the demo backend.
 * Run with `npm run store:shots`. It has its own config and port so the normal suites
 * aren't slowed down. Output: docs/store/<store>/<size>/NN-name.png
 *
 * Sizes are what each store asks for:
 *   Play      1080 × 1920  (phone, 9:16)
 *   App Store 1290 × 2796  (6.7" iPhone)  and  1320 × 2868  (6.9" iPhone)
 */
const SIZES = [
  { store: 'play', label: '1080x1920', width: 360, height: 640, scale: 3 },
  { store: 'app-store', label: '1290x2796', width: 430, height: 932, scale: 3 },
  { store: 'app-store', label: '1320x2868', width: 440, height: 956, scale: 3 },
]

const PASSWORD = 'SiteRun!2026'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Log In' }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

/** Each shot: where to go, who as, and what must be on screen before the camera clicks. */
const SHOTS = [
  {
    name: '01-search',
    as: 'alex@acme.test',
    path: '/search/results?q=excavator',
    ready: (p: Page) => expect(p.getByRole('link', { name: /Excavator/ }).first()).toBeVisible(),
  },
  {
    name: '02-machine',
    as: 'alex@acme.test',
    path: '/machines/m-5t-komatsu',
    ready: (p: Page) => expect(p.getByRole('button', { name: 'Book Now' })).toBeVisible(),
  },
  {
    name: '03-tracking',
    as: 'alex@acme.test',
    path: '/hires/b-hire-dumper/tracking',
    ready: (p: Page) => expect(p.getByText('Live Delivery Tracking')).toBeVisible(),
  },
  {
    name: '04-hires',
    as: 'alex@acme.test',
    path: '/hires',
    ready: (p: Page) => expect(p.getByRole('heading', { name: /Active Hires/i })).toBeVisible(),
  },
  {
    name: '05-supplier-machines',
    as: 'jordan@turnerplant.test',
    path: '/supplier/machines',
    ready: (p: Page) => expect(p.getByRole('heading', { name: /Machines/i })).toBeVisible(),
  },
  {
    name: '06-payouts',
    as: 'jordan@turnerplant.test',
    path: '/supplier/payouts',
    ready: (p: Page) => expect(p.getByText('Available for Payout')).toBeVisible(),
  },
  {
    name: '07-compliance',
    as: 'jordan@turnerplant.test',
    path: '/supplier/compliance',
    ready: (p: Page) => expect(p.getByRole('heading', { name: /Compliance/i })).toBeVisible(),
  },
]

for (const size of SIZES) {
  test.describe(`${size.store} ${size.label}`, () => {
    test.use({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: size.scale,
    })

    for (const shot of SHOTS) {
      test(shot.name, async ({ page }) => {
        await signIn(page, shot.as)
        await page.goto(shot.path)
        await shot.ready(page)
        // Let images, maps and animations settle so nothing is caught half-drawn.
        await page.waitForLoadState('networkidle').catch(() => {})
        await page.waitForTimeout(1200)
        await page.screenshot({
          path: `docs/store/${size.store}/${size.label}/${shot.name}.png`,
          animations: 'disabled',
        })
      })
    }
  })
}
