import { Link } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { ScreenTitle } from '@/components/ui'
import { COMPANY } from '@/lib/company'

type Section = { h: string; p: string[] }

const entity = [COMPANY.legalName || COMPANY.tradingName, COMPANY.abn && `ABN ${COMPANY.abn}`]
  .filter(Boolean)
  .join(', ')

const contactLines = [
  COMPANY.privacyEmail && `Email ${COMPANY.privacyEmail}`,
  `Phone ${COMPANY.phone}`,
  COMPANY.address && `Post ${COMPANY.address}`,
].filter(Boolean) as string[]

const TERMS: Section[] = [
  {
    h: 'About these terms',
    p: [
      `These terms are an agreement between you and ${entity} (“SiteRun”, “we”). By creating an account or using the website or apps you agree to them. If you use SiteRun for a business, you confirm you can bind that business.`,
      'SiteRun is for businesses. You must be 18 or over and hold an ABN, or be invited by someone who does.',
    ],
  },
  {
    h: 'What SiteRun does',
    p: [
      'SiteRun is a marketplace. Contractors find and book construction equipment; suppliers list it and deliver it. We run the platform, check suppliers’ compliance documents and process payments.',
      'The hire agreement for a machine is between the contractor and the supplier. SiteRun does not own, operate or inspect the equipment, and is not a party to that agreement.',
    ],
  },
  {
    h: 'Accounts and teams',
    p: [
      'Give accurate details, including your business name and ABN, and keep them up to date. Keep your login private and tell us straight away if you think someone else has used it.',
      'An organisation owner decides who joins the team and what each member can do. The organisation is responsible for bookings and payments its members make.',
    ],
  },
  {
    h: 'Bookings',
    p: [
      'A booking request becomes a confirmed hire when the supplier accepts it. Prices on SiteRun exclude GST; invoices add GST at 10%.',
      'Extensions, returns and Smart Swaps are requests until the supplier confirms them. You can cancel a booking in the app while it is requested or confirmed. Once a machine is on its way, speak to the supplier.',
      'The contractor is responsible for safe site access, a suitable set-down area and the equipment while it is on site.',
    ],
  },
  {
    h: 'Payments',
    p: [
      'Card payments are processed by Stripe. Your card number goes directly to Stripe and never passes through or is stored by SiteRun; we keep only the card brand, last four digits and expiry so you can recognise the card.',
      'By saving a card you authorise SiteRun to charge it for payments you or your team confirm in the app: account balances, invoices, plans and SiteCredits. Suppliers are paid through Stripe to the bank account they give Stripe, less SiteRun’s service fee. Refunds go back to the card that paid.',
    ],
  },
  {
    h: 'Plans and SiteCredits',
    p: [
      'Plans renew each billing period until you cancel. Cancelling stops the next renewal; the current period runs to its end. SiteCredits are not refundable or transferable, except where the law requires.',
    ],
  },
  {
    h: 'Suppliers',
    p: [
      'Listings must describe the machine, its condition and its rates accurately. Suppliers must hold current insurance, registration and inspection records for every listed machine, and keep them current in SiteRun.',
      'A listing goes live only after we verify its required documents. When a required document expires, the listing is paused until a current one is approved. Verifying documents does not mean we guarantee a machine’s condition.',
    ],
  },
  {
    h: 'Operators and site safety',
    p: [
      'Operators must hold the licences their work requires, including a high risk work licence where one applies, and follow work health and safety laws and each site’s rules.',
      'During a delivery an operator can share their live location so the contractor can follow the truck. Sharing runs only while it is switched on in the app, and stops when the delivery ends.',
    ],
  },
  {
    h: 'When SiteRun steps in',
    p: [
      'If a hire goes wrong and the two businesses can’t agree, SiteRun can cancel the hire, change its dates or total, or refund a payment. We do that only to settle a dispute or fix a mistake, we tell both businesses what changed and why, and we keep a record of it.',
    ],
  },
  {
    h: 'Using SiteRun properly',
    p: [
      'Do not use SiteRun to break the law, mislead others, harass anyone, upload documents that are not genuine, copy or scrape the platform, or get around its security or rate limits.',
    ],
  },
  {
    h: 'Australian Consumer Law',
    p: [
      'Nothing in these terms excludes rights you have under the Australian Consumer Law that cannot be excluded. Where the law allows us to limit our liability for a failure to meet a guarantee, our liability is limited to supplying the service again or paying the cost of having it supplied again.',
    ],
  },
  {
    h: 'Liability',
    p: [
      'To the extent the law allows, SiteRun is not liable for the condition or performance of equipment, site conditions, the acts of contractors, suppliers or operators, or for indirect or consequential loss such as lost profit or delay costs.',
    ],
  },
  {
    h: 'Suspension and closing an account',
    p: [
      'We may pause a listing or suspend an account that breaks these terms, puts people at risk or has expired compliance documents. You can ask us to delete your account from Account → Privacy & Security at any time; we do it within 30 days. Amounts already owed remain payable.',
    ],
  },
  {
    h: 'Changes',
    p: [
      'We will tell you in the app or by email before a significant change to these terms takes effect. Continuing to use SiteRun after that means you accept the change.',
    ],
  },
  {
    h: 'Governing law',
    p: [
      'These terms are governed by the laws of Australia and of the state or territory where SiteRun’s registered office is located, and you agree to the jurisdiction of its courts.',
    ],
  },
]

const PRIVACY: Section[] = [
  {
    h: 'About this policy',
    p: [
      `${entity} (“SiteRun”, “we”) handles personal information in line with the Privacy Act 1988 (Cth) and the Australian Privacy Principles. This policy explains what we collect, why, who we share it with and how to reach us.`,
    ],
  },
  {
    h: 'What we collect',
    p: [
      'Account details: your name, email address, phone number and password (the password is stored only as a secure hash by our authentication provider).',
      'Business details: company name, ABN, address, sites, team members and their roles.',
      'Hire activity: bookings, messages and attachments, reviews, invoices and support requests.',
      'Compliance documents suppliers and operators upload, such as insurance certificates, registrations and licences.',
      'Payment details: the card brand, last four digits and expiry. The full card number is held by Stripe, not by us. Suppliers’ payout bank details.',
      'Location: an operator’s live location while they choose to share it during a delivery. On the apps this keeps working while the phone is locked, and the phone shows that sharing is on until the driver stops it. When you tap “Use my location” on the site map, your position only places the pin; it is kept only if you save that spot as the site’s location.',
      'Device and app data: push notification tokens, and error reports when the app fails (the error message, the page, the browser or app version). Error reports do not include what you typed into forms.',
      'Usage counts: that a search was made (and the words searched), that a machine was viewed, and that a booking was started or made, with your organisation when you are signed in. We use this to see where people are not finding what they need.',
    ],
  },
  {
    h: 'How we collect it',
    p: [
      'From you when you sign up and use SiteRun; from your organisation’s owner when they invite you; from the other business on a booking; from Stripe about payments; and automatically from your device for notifications, location sharing and error reports.',
    ],
  },
  {
    h: 'Why we use it',
    p: [
      'To run bookings and deliveries, verify compliance, take payments and pay suppliers, send the notifications you would expect, answer support requests, keep the platform secure, find and fix faults, and meet our legal obligations.',
      'We do not sell personal information and we do not use it for third-party advertising.',
    ],
  },
  {
    h: 'Who we share it with',
    p: [
      'The other business on a booking sees the details that booking needs, such as site address, contact name and phone, and the delivery’s live location while it is shared. Your organisation’s members see what their role allows.',
      'Service providers who run parts of SiteRun for us: Supabase (database, storage and sign-in, hosted in Sydney), Stripe (payments to us and payouts to suppliers), Google Firebase and Apple (delivering push notifications), Resend (sending our emails), Vercel (website hosting), Esri (map images) and Photon by Komoot (address search, which receives the text you search for).',
      'Government agencies or others where the law requires it.',
    ],
  },
  {
    h: 'Overseas disclosure',
    p: [
      'Our database and files are stored in Australia. Some providers process information overseas: Stripe, Google Firebase, Apple, Resend, Vercel and Esri in the United States and other countries, and Photon in Germany. We use providers that protect information to a standard comparable to the Australian Privacy Principles.',
    ],
  },
  {
    h: 'Security and retention',
    p: [
      'Information is encrypted in transit and at rest. Every record is protected by access rules in the database, and compliance documents and message attachments are kept in private storage and opened through links that expire.',
      'We keep information only as long as we need it: live location points for two days, error reports for 90 days, usage counts for 180 days, and account and hire records while your account is open. Invoices and payment records are kept for as long as tax and corporations law require, generally five to seven years.',
    ],
  },
  {
    h: 'Access, correction and deletion',
    p: [
      'You can see and update most of your details in Account & Settings, turn our emails off under Account → Privacy & Security, and ask us to delete your account from the same screen. To ask for a copy of your information or a correction we can’t make in the app, contact us. We respond within 30 days.',
    ],
  },
  {
    h: 'Complaints',
    p: [
      'If you think we have mishandled your information, contact us first and we will respond within 30 days. If you are not satisfied, you can complain to the Office of the Australian Information Commissioner at oaic.gov.au or on 1300 363 992.',
    ],
  },
]

const CONTENT = {
  terms: { title: 'Terms of Service', updated: '21 September 2026', sections: TERMS },
  privacy: { title: 'Privacy Policy', updated: '21 September 2026', sections: PRIVACY },
} as const

export function LegalPage({ kind }: { kind: keyof typeof CONTENT }) {
  const c = CONTENT[kind]
  return (
    <Screen header={{ bell: false }}>
      <ScreenTitle title={c.title} subtitle={`Last updated ${c.updated}`} />
      <div className="space-y-5 pb-8">
        {c.sections.map(({ h, p }) => (
          <section key={h}>
            <h2 className="text-[15px] font-semibold">{h}</h2>
            {p.map((text) => (
              <p key={text.slice(0, 40)} className="mt-1.5 text-sm leading-relaxed text-muted">
                {text}
              </p>
            ))}
          </section>
        ))}
        <section>
          <h2 className="text-[15px] font-semibold">Contact</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {entity}
            {contactLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
            <span className="block">
              Or send a request from{' '}
              <Link to="/support" className="text-primary">
                Support
              </Link>
              .
            </span>
          </p>
        </section>
      </div>
    </Screen>
  )
}
