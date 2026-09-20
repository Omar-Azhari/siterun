import { expect, test } from '@playwright/test'

// Simulates the Capacitor shell in a browser: the native bridge injects window.Capacitor
// before the app loads. Checks the app opens at Welcome (never the marketing page), that
// the native bootstrap runs without errors, and that deep links navigate.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Locked so @capacitor/core's web shim can't replace it when a plugin chunk loads.
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

test('the app opens at Welcome, not the marketing page', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Built for the people who build/i })).toBeVisible()
  expect(page.url()).toContain('/welcome')
  expect(errors).toEqual([])
})

test('signing in works in the app shell', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('alex@acme.test')
  await page.getByLabel('Password', { exact: true }).fill('SiteRun!2026')
  await page.getByRole('button', { name: 'Log In' }).click()
  await expect(page).toHaveURL(/\/home/)
  await expect(page.getByRole('heading', { name: 'Browse Equipment' })).toBeVisible()
})

test('no service worker is registered inside the app', async ({ page }) => {
  await page.goto('/welcome')
  await page.waitForTimeout(1500)
  expect(
    await page.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length)),
  ).toBe(0)
})
