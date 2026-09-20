import { expect, test, type Page } from '@playwright/test'

// Key screens in the simulated app shell (no emulator on this machine). Phone size.
test.use({ viewport: { width: 390, height: 844 } })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Capacitor', {
      value: {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
        platform: 'android',
        isNative: true,
        Plugins: {},
      },
      writable: true,
      configurable: true,
    })
  })
})

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('SiteRun!2026')
  await page.getByRole('button', { name: 'Log In' }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

const shots = [
  { name: '1-welcome', path: '/welcome' },
  { name: '2-home', path: '/home', as: 'alex@acme.test' },
  { name: '3-search', path: '/search/results?category=excavators', as: 'alex@acme.test' },
  {
    name: '4-tracking',
    path: '/hires/eb480048-7630-48dc-a166-cb8a4e073645/tracking',
    as: 'alex@acme.test',
  },
  { name: '5-supplier', path: '/supplier', as: 'jordan@turnerplant.test' },
  { name: '6-admin', path: '/admin', as: 'admin@siterun.test' },
]

for (const s of shots) {
  test(s.name, async ({ page }) => {
    if (s.as) await login(page, s.as)
    await page.goto(s.path)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `docs/checkpoints/phase-6/${s.name}.png` })
  })
}
