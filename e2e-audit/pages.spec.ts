import { writeFileSync, mkdirSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

// Audit pass 1: open every route as every role on the Supabase build and record
// crashes, console errors, failed requests and error screens.
const PASSWORD = 'SiteRun!2026'
const ID = {
  hireOnSite: 'fd42c32f-c158-4769-ada7-0a0440139ca5',
  hireInTransit: 'eb480048-7630-48dc-a166-cb8a4e073645',
  confirmed: 'c2778e0e-0d84-4cb0-a2d9-39ce464a5346',
  requested: 'a94fbf00-00c1-4d9f-a807-f35eb093dadd',
  completed: '0dc22fb6-d804-4683-ae4c-cb41c9af8524',
  site: '6a3199b3-56ff-44af-ad4d-a65751266cc4',
  conv: '9bd9a891-9515-4aac-a1a3-64bd58e01e30',
  machine: '858b505f-5fdd-444d-a1fe-4fa911ff4f54',
  supplierRequest: '5ca3974c-5faf-438d-a6ba-6332d6786ba1',
  supplierConv: '167c4012-84e0-4ecf-a4a8-138237c30151',
  draft: 'f04a1526-528f-4b00-af74-34a154972db5',
  pendingMachine: '89108e22-6a56-4e01-aab9-19639fb94330',
  pendingDoc: '0babcb8c-da14-4c2e-a123-cefe8ac84630',
  operatorJob: 'e0f0070a-157e-4725-a166-f5e966a99e7f',
}

const PUBLIC = [
  '/',
  '/welcome',
  '/login',
  '/signup/role',
  '/signup?role=contractor',
  '/forgot-password',
  '/terms',
  '/privacy',
]
const CONTRACTOR = [
  '/home',
  '/browse',
  '/search',
  '/search/results?category=excavators',
  '/search/results?q=excavator&location=Melbourne',
  `/machines/${ID.machine}`,
  `/machines/${ID.machine}/book`,
  `/bookings/${ID.confirmed}/confirmed`,
  `/bookings/${ID.confirmed}`,
  `/bookings/${ID.requested}`,
  '/bookings',
  '/hires',
  `/hires/${ID.hireOnSite}`,
  `/hires/${ID.hireInTransit}/tracking`,
  `/hires/${ID.hireOnSite}/extend`,
  `/hires/${ID.hireOnSite}/return`,
  `/hires/${ID.hireOnSite}/swap`,
  '/sites',
  `/sites/${ID.site}`,
  `/sites/${ID.site}/edit`,
  '/sites/new/location',
  '/team',
  '/team/invite',
  '/plans',
  '/payments',
  '/payments/cards/new',
  '/invoices',
  '/messages',
  `/messages/${ID.conv}`,
  '/notifications',
  '/account',
  '/account/profile',
  '/account/company',
  '/account/payment-settings',
  '/account/privacy',
  '/support',
  '/support/requests',
  '/support/articles',
  '/support/new',
]
const SUPPLIER = [
  '/supplier',
  '/supplier/performance',
  '/supplier/machines',
  '/supplier/machines/new/category',
  `/supplier/machines/${ID.machine}`,
  `/supplier/machines/${ID.draft}/edit/category`,
  `/supplier/machines/${ID.draft}/edit/details`,
  `/supplier/machines/${ID.draft}/edit/photos`,
  `/supplier/machines/${ID.draft}/edit/specs`,
  `/supplier/machines/${ID.draft}/edit/rates`,
  `/supplier/machines/${ID.draft}/edit/service-area`,
  `/supplier/machines/${ID.draft}/compliance`,
  `/supplier/machines/${ID.draft}/preview`,
  `/supplier/machines/${ID.draft}/review`,
  `/supplier/machines/${ID.machine}/live`,
  '/supplier/compliance',
  '/supplier/compliance/requirements/general',
  '/supplier/compliance/requirements/crane',
  '/supplier/compliance/requirements/operator',
  '/supplier/compliance/alerts',
  `/supplier/compliance/upload?machine=${ID.draft}&type=req-swms`,
  '/supplier/requests',
  '/supplier/dispatch',
  `/supplier/bookings/${ID.supplierRequest}`,
  '/supplier/bookings',
  '/supplier/payouts',
  '/messages',
  `/messages/${ID.supplierConv}`,
  '/notifications',
  '/account',
  '/account/company',
  '/support',
]
const OPERATOR = [
  '/operator',
  '/operator/bookings',
  `/operator/bookings/${ID.operatorJob}`,
  '/operator/documents',
  '/messages',
  '/account',
]
const ADMIN = [
  '/admin',
  '/admin/approvals',
  '/admin/approvals?tab=documents',
  `/admin/approvals/machines/${ID.pendingMachine}`,
  `/admin/approvals/documents/${ID.pendingDoc}`,
  '/admin/suppliers',
  '/admin/bookings',
  '/admin/more',
  '/notifications',
  '/account',
]
const ORG_ADMIN = ['/home', '/sites', '/team', '/bookings', '/account']
const NO_ORG = ['/onboarding/business']

type Finding = { role: string; path: string; finalUrl: string; issues: string[] }
const findings: Finding[] = []

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Log In' }).click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
}

async function sweep(page: Page, role: string, paths: string[]) {
  let issues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') issues.push(`console: ${m.text().slice(0, 200)}`)
  })
  page.on('pageerror', (e) => issues.push(`crash: ${e.message.slice(0, 200)}`))
  page.on('response', (r) => {
    const u = r.url()
    if (r.status() >= 400 && !u.includes('/auth/v1/user'))
      issues.push(`http ${r.status()}: ${u.replace(/^https?:\/\/[^/]+/, '').slice(0, 160)}`)
  })
  page.on('requestfailed', (r) => {
    const f = r.failure()?.errorText ?? ''
    if (!/ERR_ABORTED/.test(f)) issues.push(`request failed: ${r.url().slice(0, 120)} ${f}`)
  })
  for (const path of paths) {
    issues = []
    await page.goto(path)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(600)
    const text = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    for (const bad of [
      'Something went wrong',
      'couldn’t load',
      "couldn't load",
      'not found',
      'Not Found',
      'not available',
      'Page not found',
      'undefined',
      'NaN',
      'Invalid Date',
      '[object Object]',
      'null',
    ]) {
      if (text.includes(bad)) issues.push(`screen shows "${bad}"`)
    }
    if (text.trim().length < 20) issues.push('blank screen')
    const finalUrl = new URL(page.url()).pathname + new URL(page.url()).search
    if (finalUrl.split('?')[0] !== path.split('?')[0]) issues.push(`redirected to ${finalUrl}`)
    findings.push({ role, path, finalUrl, issues: [...new Set(issues)] })
  }
}

test.describe.configure({ mode: 'serial' })
test.setTimeout(600_000)

test('public', async ({ page }) => sweep(page, 'public', PUBLIC))
test('contractor', async ({ page }) => {
  await login(page, 'alex@acme.test')
  await sweep(page, 'contractor', CONTRACTOR)
})
test('supplier', async ({ page }) => {
  await login(page, 'jordan@turnerplant.test')
  await sweep(page, 'supplier', SUPPLIER)
})
test('operator', async ({ page }) => {
  await login(page, 'sam@turnerplant.test')
  await sweep(page, 'operator', OPERATOR)
})
test('org admin', async ({ page }) => {
  await login(page, 'priya@buildco.test')
  await sweep(page, 'org_admin', ORG_ADMIN)
})
test('platform admin', async ({ page }) => {
  await login(page, 'admin@siterun.test')
  await sweep(page, 'admin', ADMIN)
})
test('no business profile', async ({ page }) => {
  await login(page, 'jamie.carter@buildco.test')
  await sweep(page, 'no_org', NO_ORG)
})

test.afterAll(() => {
  mkdirSync('docs/audit', { recursive: true })
  writeFileSync('docs/audit/pages.json', JSON.stringify(findings, null, 2))
})
