import { Screen } from '@/components/layout/Screen'
import { ScreenTitle } from '@/components/ui'

const CONTENT = {
  terms: {
    title: 'Terms of Service',
    updated: '1 September 2026',
    sections: [
      [
        'Using SiteRun',
        'SiteRun is a marketplace that connects contractors who hire construction equipment with suppliers who list it. SiteRun is not a party to hire agreements between contractors and suppliers.',
      ],
      [
        'Accounts',
        'You must give accurate business details, including a valid ABN, and keep your login secure. You are responsible for activity under your account and your organisation’s team members.',
      ],
      [
        'Bookings',
        'A booking request becomes a hire agreement when the supplier accepts it. Prices are shown excluding GST; invoices add GST at 10%. Extensions, returns and swaps are subject to supplier confirmation.',
      ],
      [
        'Listings and compliance',
        'Suppliers must hold current insurance, registration and inspection documents for every listed machine. Listings go live only after SiteRun verifies required documents.',
      ],
      [
        'Payments',
        'Card payments are processed by our payment provider. SiteRun never stores full card numbers.',
      ],
      [
        'Liability',
        'To the extent permitted by the Australian Consumer Law, SiteRun is not liable for loss arising from equipment use, site conditions or supplier performance.',
      ],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: '1 September 2026',
    sections: [
      [
        'What we collect',
        'Your name, contact details, business details, bookings, messages, uploaded documents and device information needed to run the service.',
      ],
      [
        'How we use it',
        'To operate bookings, verify compliance, process payments and payouts, provide support and keep the platform secure. We do not sell personal information.',
      ],
      [
        'Sharing',
        'Booking details are shared between the contractor and supplier on that booking. Compliance documents are visible only to the uploading organisation and SiteRun administrators.',
      ],
      [
        'Storage and security',
        'Data is stored with encryption in transit and at rest. Compliance documents are kept in private storage and accessed through short-lived links.',
      ],
      [
        'Your choices',
        'You can access, correct or delete your information from Account & Settings or by contacting support. We handle requests in line with the Privacy Act 1988 (Cth).',
      ],
    ],
  },
} as const

export function LegalPage({ kind }: { kind: keyof typeof CONTENT }) {
  const c = CONTENT[kind]
  return (
    <Screen header={{ bell: false }}>
      <ScreenTitle title={c.title} subtitle={`Last updated ${c.updated}`} />
      <div className="space-y-5 pb-8">
        {c.sections.map(([h, p]) => (
          <section key={h}>
            <h2 className="text-[15px] font-semibold">{h}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{p}</p>
          </section>
        ))}
      </div>
    </Screen>
  )
}
