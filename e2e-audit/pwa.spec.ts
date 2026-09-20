import { expect, test } from '@playwright/test'

// The service worker should let the app shell load with no connection.
test('the app still opens when offline', async ({ page, context }) => {
  await page.goto('/welcome')
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
    timeout: 20_000,
  })
  await page.waitForTimeout(2000)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: /Built for the people who build/i })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: /offline/i })).toBeVisible()

  await context.setOffline(false)
})
