export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'
export type Mark = 'dot' | 'check' | 'none'

/** Status → look, as drawn across the boards. */
export const STATUS_STYLES = {
  available: { label: 'Available', tone: 'success', mark: 'dot' },
  on_site: { label: 'On Site', tone: 'success', mark: 'dot' },
  in_transit: { label: 'In Transit', tone: 'info', mark: 'dot' },
  ending_soon: { label: 'Ending Soon', tone: 'neutral', mark: 'none' },
  confirmed: { label: 'Confirmed', tone: 'info', mark: 'check' },
  booking_confirmed: { label: 'Confirmed', tone: 'success', mark: 'check' },
  hired: { label: 'Hired', tone: 'success', mark: 'check' },
  upcoming: { label: 'Upcoming', tone: 'info', mark: 'check' },
  completed: { label: 'Completed', tone: 'neutral', mark: 'check' },
  paid: { label: 'Paid', tone: 'success', mark: 'check' },
  verified: { label: 'Verified', tone: 'success', mark: 'none' },
  pending: { label: 'Pending', tone: 'info', mark: 'none' },
  pending_review: { label: 'Pending Review', tone: 'warning', mark: 'none' },
  ready_to_list: { label: 'Ready to list', tone: 'success', mark: 'check' },
  live: { label: 'Live on SiteRun', tone: 'success', mark: 'check' },
  rejected: { label: 'Rejected', tone: 'danger', mark: 'none' },
  declined: { label: 'Declined', tone: 'danger', mark: 'none' },
  cancelled: { label: 'Cancelled', tone: 'neutral', mark: 'none' },
  active: { label: 'Active', tone: 'success', mark: 'check' },
  planning: { label: 'Planning', tone: 'info', mark: 'check' },
  on_hold: { label: 'On Hold', tone: 'warning', mark: 'check' },
  open: { label: 'Open', tone: 'info', mark: 'dot' },
  in_progress: { label: 'In Progress', tone: 'warning', mark: 'dot' },
  resolved: { label: 'Resolved', tone: 'success', mark: 'dot' },
  draft: { label: 'Draft', tone: 'neutral', mark: 'none' },
  paused: { label: 'Paused', tone: 'neutral', mark: 'none' },
} satisfies Record<string, { label: string; tone: Tone; mark: Mark }>

export type StatusKey = keyof typeof STATUS_STYLES
