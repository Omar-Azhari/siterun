import { expect, test } from '@playwright/test'
import { SCREENS } from '../src/pages/dev/screenRegistry'

// Screenshots every designed screen at 390×844 for side-by-side board comparison.
// Filter with BOARDS=01,02 npx playwright test e2e/boards.spec.ts
const only = process.env.BOARDS?.split(',')
const OUT = 'docs/checkpoints/phase-2'

for (const s of SCREENS.filter((x) => !only || only.includes(x.board))) {
  test(`board ${s.board} · ${s.n} ${s.title}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    const url = `/dev/screens?go=${encodeURIComponent(s.path)}${s.as ? `&as=${encodeURIComponent(s.as)}` : ''}`
    await page.goto(url)
    await page.waitForURL((u) => !u.pathname.startsWith('/dev/screens'))
    await page.waitForLoadState('networkidle').catch(() => undefined)
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('main').first()).toBeVisible()
    await expect(page.getByRole('status', { name: 'Loading' })).toHaveCount(0)
    await page.waitForTimeout(s.settle ?? 500)
    await page.screenshot({ path: `${OUT}/board-${s.board}/${String(s.n).padStart(2, '0')}.png` })
    expect(errors).toEqual([])
  })
}
