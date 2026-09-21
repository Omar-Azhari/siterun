import { expect, test } from '@playwright/test'

// Change a password twice in a row (the second change used to be dropped).
test('change password twice', async ({ page }) => {
  const sent: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/auth/v1/user') && r.method() === 'PUT') sent.push('PUT /user')
  })
  page.on('console', (m) => console.log('console', m.type(), m.text().slice(0, 150)))
  await page.goto('/login')
  await page.getByLabel('Email address').fill('priya@buildco.test')
  await page.getByLabel('Password', { exact: true }).fill('SiteRun!2026')
  await page.getByRole('button', { name: 'Log In' }).click()
  await expect(page).not.toHaveURL(/\/login/)
  await page.goto('/account/privacy')

  const change = async (pw: string) => {
    await page.getByLabel('New password').fill(pw)
    await page.getByLabel('Confirm password').fill(pw)
    await page.getByRole('button', { name: 'Update Password' }).click()
    await page.waitForTimeout(3000)
    console.log(
      'after',
      pw,
      sent.length,
      page.url(),
      (await page.locator('main').innerText()).slice(0, 200).replace(/\n/g, ' | '),
    )
  }

  // The seeded password has to be back even if an assertion below fails, or every other
  // test signing in as this account breaks.
  try {
    await change('SiteRun!2026x')
    expect(sent.length).toBe(1)
  } finally {
    await change('SiteRun!2026')
  }
  expect(sent.length).toBe(2)
})
