// Loaded on demand (see ./download.ts) so @react-pdf stays out of the main bundle.
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'
import type { Invoice, Organisation } from '@/data/types'

const NAVY = '#0B1F44'
const BLUE = '#006CFF'
const money = (c: number) =>
  (c / 100).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
const d = (iso: string) => format(parseISO(iso), 'd MMM yyyy')

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: '#1f2937', fontFamily: 'Helvetica' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  brand: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: NAVY },
  brandAccent: { color: BLUE },
  tagline: { fontSize: 9, color: '#6b7280', marginTop: 2 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'right' },
  muted: { color: '#6b7280' },
  row: { flexDirection: 'row' },
  block: { marginBottom: 18 },
  label: {
    fontSize: 8,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  table: { borderTopWidth: 1, borderColor: '#e5e7eb', marginTop: 8 },
  th: {
    flexDirection: 'row',
    backgroundColor: '#f4f7fb',
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  c1: { flex: 1 },
  c2: { width: 90, textAlign: 'right' },
  c3: { width: 80, textAlign: 'right' },
  totals: { marginTop: 12, marginLeft: 'auto', width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  grand: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: NAVY,
    borderTopWidth: 1,
    borderColor: NAVY,
    paddingTop: 6,
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
})

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={s.header}>
      <View>
        <Text style={s.brand}>
          Site<Text style={s.brandAccent}>Run</Text>
        </Text>
        <Text style={s.tagline}>Machines. People. Progress.</Text>
        <Text style={[s.muted, { marginTop: 6 }]}>SiteRun Pty Ltd · ABN 51 824 753 556</Text>
      </View>
      <View>
        <Text style={s.title}>{title}</Text>
        <Text style={[s.muted, { textAlign: 'right', marginTop: 2 }]}>{sub}</Text>
      </View>
    </View>
  )
}

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text>Pay by bank transfer: BSB 062 001 · Account 1234 5678 · SiteRun Pty Ltd</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  )
}

export function InvoiceDocument({ invoice, org }: { invoice: Invoice; org: Organisation }) {
  const total = invoice.amountCents + invoice.gstCents
  return (
    <Document title={`${invoice.number} · SiteRun`} author="SiteRun">
      <Page size="A4" style={s.page}>
        <Header title="Tax Invoice" sub={invoice.number} />
        <View style={[s.row, s.block]}>
          <View style={s.c1}>
            <Text style={s.label}>Bill to</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{org.name}</Text>
            <Text>ABN {org.abn}</Text>
            <Text>{org.address}</Text>
          </View>
          <View>
            <Text style={s.label}>Issued</Text>
            <Text>{d(invoice.issuedAt)}</Text>
            <Text style={[s.label, { marginTop: 8 }]}>Due</Text>
            <Text>{d(invoice.dueDate)}</Text>
            <Text style={[s.label, { marginTop: 8 }]}>Status</Text>
            <Text>{invoice.status === 'paid' ? 'Paid' : 'Awaiting payment'}</Text>
          </View>
        </View>
        <View style={s.table}>
          <View style={s.th}>
            <Text style={s.c1}>Description</Text>
            <Text style={s.c2}>Amount (ex GST)</Text>
          </View>
          {invoice.lines.map((l, i) => (
            <View key={i} style={s.tr}>
              <Text style={s.c1}>{l.description}</Text>
              <Text style={s.c2}>{money(l.amountCents)}</Text>
            </View>
          ))}
        </View>
        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text>Subtotal</Text>
            <Text>{money(invoice.amountCents)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text>GST (10%)</Text>
            <Text>{money(invoice.gstCents)}</Text>
          </View>
          <View style={[s.totalRow, s.grand]}>
            <Text>Total (AUD)</Text>
            <Text>{money(total)}</Text>
          </View>
        </View>
        <Footer />
      </Page>
    </Document>
  )
}

export function StatementDocument({
  invoices,
  org,
  period,
}: {
  invoices: Invoice[]
  org: Organisation
  period: string
}) {
  const total = invoices.reduce((a, i) => a + i.amountCents + i.gstCents, 0)
  const owing = invoices
    .filter((i) => i.status !== 'paid')
    .reduce((a, i) => a + i.amountCents + i.gstCents, 0)
  return (
    <Document title={`Statement ${period} · SiteRun`} author="SiteRun">
      <Page size="A4" style={s.page}>
        <Header title="Account Statement" sub={period} />
        <View style={s.block}>
          <Text style={s.label}>Account</Text>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{org.name}</Text>
          <Text>ABN {org.abn}</Text>
          <Text>{org.address}</Text>
        </View>
        <View style={s.table}>
          <View style={s.th}>
            <Text style={s.c1}>Invoice</Text>
            <Text style={s.c3}>Issued</Text>
            <Text style={s.c3}>Status</Text>
            <Text style={s.c2}>Total inc GST</Text>
          </View>
          {invoices.map((i) => (
            <View key={i.id} style={s.tr}>
              <Text style={s.c1}>{i.number}</Text>
              <Text style={s.c3}>{d(i.issuedAt)}</Text>
              <Text style={s.c3}>{i.status === 'paid' ? 'Paid' : `Due ${d(i.dueDate)}`}</Text>
              <Text style={s.c2}>{money(i.amountCents + i.gstCents)}</Text>
            </View>
          ))}
          {invoices.length === 0 && (
            <View style={s.tr}>
              <Text style={s.muted}>No invoices in this period.</Text>
            </View>
          )}
        </View>
        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text>Invoiced</Text>
            <Text>{money(total)}</Text>
          </View>
          <View style={[s.totalRow, s.grand]}>
            <Text>Balance owing</Text>
            <Text>{money(owing)}</Text>
          </View>
        </View>
        <Footer />
      </Page>
    </Document>
  )
}
