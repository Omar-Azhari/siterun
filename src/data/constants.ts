// Small constants shared by screens and both backends (kept out of the seed so
// importing them doesn't pull the demo dataset into a page's bundle).

export const DEMO_PASSWORD = 'SiteRun!2026'

export const DEMO_ACCOUNTS = [
  {
    role: 'Contractor',
    email: 'alex@acme.test',
    name: 'Alex Turner',
    org: 'Acme Construction Pty Ltd',
  },
  {
    role: 'Supplier',
    email: 'jordan@turnerplant.test',
    name: 'Jordan Lee',
    org: 'Turner Plant Hire',
  },
  { role: 'Operator', email: 'sam@turnerplant.test', name: 'Sam Nguyen', org: 'Turner Plant Hire' },
  {
    role: 'Organisation admin',
    email: 'priya@buildco.test',
    name: 'Priya Shah',
    org: 'BuildCo Pty Ltd',
  },
  { role: 'Platform admin', email: 'admin@siterun.test', name: 'Morgan Blake', org: 'SiteRun' },
] as const

/** Verification code accepted by the in-browser demo backend. */
export const DEMO_OTP = '123456'

export const PROJECT_TYPES = [
  'Commercial Construction',
  'Residential Construction',
  'Civil & Infrastructure',
  'Industrial',
  'Commercial Fitout',
  'Mining & Resources',
  'Other',
]
