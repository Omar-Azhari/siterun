import { expect, test } from '@playwright/test'

test('brand page renders logos and tokens', async ({ page }) => {
  await page.goto('/dev/brand')
  await expect(page.getByRole('heading', { name: /Checkpoint 0/ })).toBeVisible()
  await expect(page.getByRole('img', { name: 'SiteRun horizontal logo' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'SiteRun', exact: true })).toBeVisible()
  await page.screenshot({
    path: 'docs/checkpoints/checkpoint-0-brand-page-390.png',
    fullPage: true,
  })
})
