import { expect, test, type Page } from '@playwright/test'

// Audit pass 3: screens with maps, charts, sheets and long forms at tablet and desktop widths.
const shots: { as: string; path: string; name: string }[] = [
  {
    as: 'alex@acme.test',
    path: '/hires/eb480048-7630-48dc-a166-cb8a4e073645/tracking',
    name: 'tracking',
  },
  { as: 'alex@acme.test', path: '/machines/858b505f-5fdd-444d-a1fe-4fa911ff4f54', name: 'machine' },
  {
    as: 'alex@acme.test',
    path: '/machines/858b505f-5fdd-444d-a1fe-4fa911ff4f54/book',
    name: 'book',
  },
  { as: 'alex@acme.test', path: '/messages/9bd9a891-9515-4aac-a1a3-64bd58e01e30', name: 'chat' },
  { as: 'alex@acme.test', path: '/bookings', name: 'calendar' },
  { as: 'alex@acme.test', path: '/sites/new/location', name: 'site-location' },
  { as: 'jordan@turnerplant.test', path: '/supplier/dispatch', name: 'dispatch' },
  {
    as: 'jordan@turnerplant.test',
    path: '/supplier/machines/f04a1526-528f-4b00-af74-34a154972db5/edit/service-area',
    name: 'service-area',
  },
  { as: 'admin@siterun.test', path: '/admin', name: 'admin' },
]

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('SiteRun!2026')
  await page.getByRole('button', { name: 'Log In' }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

for (const width of [1440, 768]) {
  test.describe(`${width}`, () => {
    test.use({ viewport: { width, height: width === 1440 ? 900 : 1024 } })
    for (const s of shots) {
      test(s.name, async ({ page }) => {
        await login(page, s.as)
        await page.goto(s.path)
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1500)
        await page.screenshot({ path: `docs/audit/visual/${s.name}-${width}.png` })
      })
    }
  })
}
