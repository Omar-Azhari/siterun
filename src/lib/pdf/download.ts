import { createElement } from 'react'
import type { Invoice, Organisation } from '@/data/types'

async function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

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
