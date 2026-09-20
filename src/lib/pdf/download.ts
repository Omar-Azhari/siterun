import { createElement } from 'react'
import type { Invoice, Organisation } from '@/data/types'
import { saveFile } from '@/native/device'

/** Downloads on the web; saves to the Documents folder in the apps. */
const save = saveFile

export async function downloadInvoicePdf(invoice: Invoice, org: Organisation) {
  const [{ pdf }, { InvoiceDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./documents'),
  ])
  const blob = await pdf(
    createElement(InvoiceDocument, { invoice, org }) as Parameters<typeof pdf>[0],
  ).toBlob()
  await save(blob, `${invoice.number}.pdf`)
}

export async function downloadStatementPdf(invoices: Invoice[], org: Organisation, period: string) {
  const [{ pdf }, { StatementDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./documents'),
  ])
  const blob = await pdf(
    createElement(StatementDocument, { invoices, org, period }) as Parameters<typeof pdf>[0],
  ).toBlob()
  await save(blob, `SiteRun-statement-${period.replace(/\s+/g, '-')}.pdf`)
}
