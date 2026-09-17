// Every designed screen, with the demo account and seed data that reproduce it.
// Used by /dev/screens and the Playwright board comparison suite.

export interface ScreenEntry {
  board: string
  n: number
  title: string
  path: string
  /** Demo login to use; null = signed out. */
  as: string | null
  /** Extra wait (ms) for maps/animations before screenshots. */
  settle?: number
}

const ALEX = 'alex@acme.test'
const JORDAN = 'jordan@turnerplant.test'
const ADMIN = 'admin@siterun.test'
const SAM = 'sam@turnerplant.test'
const JAMIE = 'jamie.carter@buildco.test'

export const BOARDS = [
  { id: '01', title: 'Entry & Account Setup', image: '01-entry-account.jpeg' },
  { id: '02', title: 'Site Setup, Team & Plans', image: '02-site-team-plans.jpeg' },
  { id: '03', title: 'Browse, Search & Book Equipment', image: '03-browse-book.jpeg' },
  { id: '04', title: 'Active Hire, Delivery & Smart Swap', image: '04-active-hire.jpeg' },
  { id: '05', title: 'Customer Operations & Admin', image: '05-customer-ops.jpeg' },
  { id: '07', title: 'Add Machine & Listing Setup', image: '07-add-machine.jpeg' },
  { id: '08', title: 'Required Documents & Compliance', image: '08-compliance.jpeg' },
  { id: '09', title: 'Review, Go Live & Supplier Operations', image: '09-review-go-live.jpeg' },
  {
    id: '10',
    title: 'Supplier Performance, Alerts & Platform Admin',
    image: '10-supplier-admin.jpeg',
  },
  { id: 'extra', title: 'Supporting screens (not on the boards)', image: null },
] as const

export const SCREENS: ScreenEntry[] = [
  { board: '01', n: 1, title: 'Splash / Welcome', path: '/welcome', as: null },
  { board: '01', n: 2, title: 'Choose Role', path: '/signup/role', as: null },
  { board: '01', n: 3, title: 'Sign Up', path: '/signup?role=contractor', as: null },
  { board: '01', n: 4, title: 'Log In', path: '/login', as: null },
  {
    board: '01',
    n: 5,
    title: 'OTP Verification',
    path: '/verify?email=jamie.carter%40buildco.com',
    as: null,
  },
  { board: '01', n: 6, title: 'Business Profile', path: '/onboarding/business', as: JAMIE },

  {
    board: '02',
    n: 1,
    title: 'Create Your First Site',
    path: '/sites/new/location',
    as: ALEX,
    settle: 1500,
  },
  { board: '02', n: 2, title: 'Site Details', path: '/sites/new/details?demo=1', as: ALEX },
  { board: '02', n: 3, title: 'Site Access Window', path: '/sites/new/access?demo=1', as: ALEX },
  { board: '02', n: 4, title: 'Invite Team Members', path: '/team/invite', as: ALEX },
  { board: '02', n: 5, title: 'Choose Plan & SiteCredits', path: '/plans', as: ALEX },
  { board: '02', n: 6, title: 'Your Sites', path: '/sites', as: ALEX },

  { board: '03', n: 1, title: 'Browse Equipment', path: '/browse', as: ALEX },
  { board: '03', n: 2, title: 'Search & Filters', path: '/search?q=Excavator', as: ALEX },
  {
    board: '03',
    n: 3,
    title: 'Search Results',
    path: '/search/results?q=Excavator&location=Melbourne%2C+VIC&min=3&max=10',
    as: ALEX,
  },
  { board: '03', n: 4, title: 'Machine Detail', path: '/machines/m-5t-komatsu', as: ALEX },
  { board: '03', n: 5, title: 'Book Equipment', path: '/machines/m-5t-komatsu/book', as: ALEX },
  {
    board: '03',
    n: 6,
    title: 'Booking Confirmed',
    path: '/bookings/b-confirmed-5t/confirmed',
    as: ALEX,
    settle: 1200,
  },

  { board: '04', n: 1, title: 'Active Hires', path: '/hires', as: ALEX },
  { board: '04', n: 2, title: 'Active Hire Detail', path: '/hires/b-hire-3t', as: ALEX },
  {
    board: '04',
    n: 3,
    title: 'Live Delivery Tracking',
    path: '/hires/b-hire-dumper/tracking',
    as: ALEX,
    settle: 1500,
  },
  { board: '04', n: 4, title: 'Extend Hire', path: '/hires/b-hire-3t/extend', as: ALEX },
  {
    board: '04',
    n: 5,
    title: 'Off-hire / Schedule Return',
    path: '/hires/b-hire-3t/return',
    as: ALEX,
  },
  { board: '04', n: 6, title: 'Smart Swap', path: '/hires/b-hire-3t/swap', as: ALEX },

  { board: '05', n: 1, title: 'Bookings Calendar', path: '/bookings', as: ALEX },
  { board: '05', n: 2, title: 'Messages', path: '/messages/conv-acme-eq', as: ALEX },
  { board: '05', n: 3, title: 'Payments', path: '/payments', as: ALEX },
  { board: '05', n: 4, title: 'Invoices & Statements', path: '/invoices', as: ALEX },
  { board: '05', n: 5, title: 'Notifications', path: '/notifications', as: ALEX },
  { board: '05', n: 6, title: 'Account & Settings', path: '/account', as: ALEX },

  {
    board: '07',
    n: 1,
    title: 'Add Machine: Category',
    path: '/supplier/machines/new/category',
    as: JORDAN,
  },
  {
    board: '07',
    n: 2,
    title: 'Machine Details',
    path: '/supplier/machines/m-cat320d-draft/edit/details',
    as: JORDAN,
  },
  {
    board: '07',
    n: 3,
    title: 'Photos',
    path: '/supplier/machines/m-cat320d-draft/edit/photos',
    as: JORDAN,
  },
  {
    board: '07',
    n: 4,
    title: 'Asset Specifications',
    path: '/supplier/machines/m-cat320d-draft/edit/specs',
    as: JORDAN,
  },
  {
    board: '07',
    n: 5,
    title: 'Rates & Availability',
    path: '/supplier/machines/m-cat320d-draft/edit/rates',
    as: JORDAN,
  },
  {
    board: '07',
    n: 6,
    title: 'Service Area & Delivery',
    path: '/supplier/machines/m-cat320d-draft/edit/service-area',
    as: JORDAN,
    settle: 1500,
  },

  { board: '08', n: 1, title: 'Compliance Checklist', path: '/supplier/compliance', as: JORDAN },
  {
    board: '08',
    n: 2,
    title: 'Upload Document',
    path: '/supplier/compliance/upload?machine=m-cat320d-draft&type=req-insurance&demo=1',
    as: JORDAN,
  },
  {
    board: '08',
    n: 3,
    title: 'General Plant Requirements',
    path: '/supplier/compliance/requirements/general',
    as: JORDAN,
  },
  {
    board: '08',
    n: 4,
    title: 'Crane Requirements',
    path: '/supplier/compliance/requirements/crane',
    as: JORDAN,
  },
  {
    board: '08',
    n: 5,
    title: 'Operator Compliance Documents',
    path: '/supplier/compliance/requirements/operator',
    as: JORDAN,
  },
  {
    board: '08',
    n: 6,
    title: 'Compliance Status',
    path: '/supplier/machines/m-20t-komatsu/compliance',
    as: JORDAN,
  },

  {
    board: '09',
    n: 1,
    title: 'Preview Listing',
    path: '/supplier/machines/m-20t-komatsu/preview',
    as: JORDAN,
  },
  {
    board: '09',
    n: 2,
    title: 'Review & Submit',
    path: '/supplier/machines/m-20t-komatsu/review',
    as: JORDAN,
  },
  {
    board: '09',
    n: 3,
    title: 'Listing Live',
    path: '/supplier/machines/m-20t-cat320/live',
    as: JORDAN,
    settle: 1200,
  },
  { board: '09', n: 4, title: 'Booking Requests', path: '/supplier/requests', as: JORDAN },
  { board: '09', n: 5, title: 'Bookings & Dispatch', path: '/supplier/dispatch', as: JORDAN },
  { board: '09', n: 6, title: 'Payouts', path: '/supplier/payouts', as: JORDAN },

  { board: '10', n: 1, title: 'Performance', path: '/supplier/performance', as: JORDAN },
  {
    board: '10',
    n: 2,
    title: 'Booking Detail',
    path: '/supplier/bookings/b-req-buildco',
    as: JORDAN,
  },
  {
    board: '10',
    n: 3,
    title: 'Compliance Alerts',
    path: '/supplier/compliance/alerts',
    as: JORDAN,
  },
  { board: '10', n: 4, title: 'Support', path: '/support', as: JORDAN },
  { board: '10', n: 5, title: 'Admin Approvals', path: '/admin/approvals', as: ADMIN },
  { board: '10', n: 6, title: 'Admin Dashboard', path: '/admin', as: ADMIN },

  { board: 'extra', n: 1, title: 'Forgot Password', path: '/forgot-password', as: null },
  { board: 'extra', n: 2, title: 'Reset Password', path: '/reset-password', as: ALEX },
  { board: 'extra', n: 3, title: 'Contractor Home', path: '/home', as: ALEX },
  { board: 'extra', n: 4, title: 'Conversations List', path: '/messages', as: ALEX },
  {
    board: 'extra',
    n: 5,
    title: 'Booking Detail (contractor)',
    path: '/bookings/b-req-alex',
    as: ALEX,
  },
  { board: 'extra', n: 6, title: 'Company Details', path: '/account/company', as: ALEX },
  { board: 'extra', n: 7, title: 'Team & Permissions', path: '/team', as: ALEX },
  { board: 'extra', n: 8, title: 'Payment Settings', path: '/account/payment-settings', as: ALEX },
  { board: 'extra', n: 9, title: 'Privacy & Security', path: '/account/privacy', as: ALEX },
  { board: 'extra', n: 10, title: 'Supplier Home', path: '/supplier', as: JORDAN },
  { board: 'extra', n: 11, title: 'My Machines', path: '/supplier/machines', as: JORDAN },
  { board: 'extra', n: 12, title: 'Submit a Request', path: '/support/new', as: JORDAN },
  { board: 'extra', n: 13, title: 'Operator Home', path: '/operator', as: SAM },
  {
    board: 'extra',
    n: 14,
    title: 'Operator Booking',
    path: '/operator/bookings/b-disp-metro',
    as: SAM,
  },
  { board: 'extra', n: 15, title: 'Operator Documents', path: '/operator/documents', as: SAM },
  {
    board: 'extra',
    n: 16,
    title: 'Admin Machine Review',
    path: '/admin/approvals/machines/m-5t-supplyco',
    as: ADMIN,
  },
  { board: 'extra', n: 17, title: 'Admin Suppliers', path: '/admin/suppliers', as: ADMIN },
  { board: 'extra', n: 18, title: 'Admin Bookings', path: '/admin/bookings', as: ADMIN },
  { board: 'extra', n: 19, title: 'Terms of Service', path: '/terms', as: null },
  { board: 'extra', n: 20, title: 'Not Found', path: '/this-page-does-not-exist', as: null },
]
