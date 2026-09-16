import { expect, test } from '@playwright/test'

const SHOTS = 'docs/checkpoints/checkpoint-1'

test.describe('/dev/components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dev/components')
    await expect(page.getByRole('heading', { name: 'Component gallery' })).toBeVisible()
  })

  test('renders without console errors and screenshots each section at 390px', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(e.message))
    await page.reload()
    await page.evaluate(() => document.fonts.ready)
    // Let the success animation settle.
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${SHOTS}/full-page.png`, fullPage: true })
    const sections = page.locator('section')
    const count = await sections.count()
    for (let i = 0; i < count; i++) {
      const id = await sections.nth(i).getAttribute('id')
      await sections
        .nth(i)
        .screenshot({ path: `${SHOTS}/${String(i + 1).padStart(2, '0')}-${id}.png` })
    }
    // The only expected error is the deliberately broken thumbnail URL.
    expect(errors.filter((e) => !e.includes('does-not-exist'))).toEqual([])
  })

  test('segmented tabs support click and arrow keys', async ({ page }) => {
    const tabs = page.getByRole('tablist', { name: 'Hire status' })
    await tabs.getByRole('tab', { name: 'On Site (3)' }).click()
    await expect(tabs.getByRole('tab', { name: 'On Site (3)' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await page.keyboard.press('ArrowRight')
    await expect(tabs.getByRole('tab', { name: 'In Transit (1)' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(tabs.getByRole('tab', { name: 'In Transit (1)' })).toBeFocused()
  })

  test('selectable cards act as a radio group', async ({ page }) => {
    const group = page.getByRole('radiogroup', { name: 'Plan' })
    await group.getByRole('radio', { name: /Starter/ }).click()
    await expect(group.getByRole('radio', { name: /Starter/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect(group.getByRole('radio', { name: 'Pro, Most Popular' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    await expect(group.getByRole('radio', { name: /Enterprise/ })).toBeDisabled()
  })

  test('toggle switches flip aria-checked', async ({ page }) => {
    const sw = page.getByRole('switch', { name: 'Third-party transport' })
    await expect(sw).toHaveAttribute('aria-checked', 'false')
    await sw.click()
    await expect(sw).toHaveAttribute('aria-checked', 'true')
  })

  test('OTP input auto-advances, handles backspace and paste', async ({ page }) => {
    const group = page.getByRole('group', { name: 'Verification code' }).nth(1)
    const first = group.getByRole('textbox', { name: 'Digit 1 of 6' })
    await first.click()
    await page.keyboard.type('12')
    await expect(group.getByRole('textbox', { name: 'Digit 3 of 6' })).toBeFocused()
    await page.keyboard.press('Backspace')
    await expect(group.getByRole('textbox', { name: 'Digit 2 of 6' })).toHaveValue('')
    await expect(group.getByRole('textbox', { name: 'Digit 2 of 6' })).toBeFocused()

    await first.focus()
    await page.evaluate(() => {
      const dt = new DataTransfer()
      dt.setData('text', '987 654')
      document.activeElement?.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }),
      )
    })
    for (const [i, d] of ['9', '8', '7', '6', '5', '4'].entries()) {
      await expect(group.getByRole('textbox', { name: `Digit ${i + 1} of 6` })).toHaveValue(d)
    }
    await expect(page.getByRole('status').filter({ hasText: 'Code entered' })).toBeVisible()
  })

  test('phone field shows the country picker and the number input side by side', async ({
    page,
  }) => {
    const number = page.getByLabel('Phone number', { exact: true })
    await expect(number).toBeVisible()
    await number.fill('0412345678')
    await expect(number).toHaveValue('412 345 678')
    const picker = page.getByLabel('Country code').first()
    const [a, b] = await Promise.all([picker.boundingBox(), number.boundingBox()])
    expect(a && b && a.x + a.width <= b.x).toBe(true)
  })

  test('password visibility toggle and textarea counter', async ({ page }) => {
    const pw = page.getByLabel('Password', { exact: true })
    await expect(pw).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: 'Show password' }).click()
    await expect(pw).toHaveAttribute('type', 'text')

    const notes = page.getByLabel('Access notes (optional)')
    await notes.fill('Gate 2')
    await expect(page.getByText('6/250')).toBeVisible()
  })

  test('chips can be removed and the bottom sheet opens and closes', async ({ page }) => {
    await page.getByRole('button', { name: 'Remove GP Bucket' }).click()
    await expect(page.getByRole('button', { name: 'Remove GP Bucket' })).toHaveCount(0)

    await page.getByRole('button', { name: 'Open bottom sheet' }).click()
    const dialog = page.getByRole('dialog', { name: 'Filters' })
    await expect(dialog).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/bottom-sheet.png` })
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('toasts appear on demand', async ({ page }) => {
    await page.getByRole('button', { name: 'Error', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Upload failed' })).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/toast.png` })
  })

  test('bottom nav switches role items', async ({ page }) => {
    await page.getByRole('tablist', { name: 'Role' }).getByRole('tab', { name: 'Admin' }).click()
    const nav = page.getByRole('navigation', { name: 'Main' })
    await expect(nav.getByRole('link', { name: /Approvals/ })).toBeVisible()
    await expect(nav.getByRole('link', { name: /Dashboard/ })).toBeVisible()
  })
})
