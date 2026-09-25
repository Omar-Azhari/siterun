// The one email SiteRun sends: a notification, in the brand's colours. No tracking
// pixels, no images loaded from elsewhere. Pure functions, so Vitest can test them.

export interface EmailPayload {
  to: string
  name: string | null
  title: string
  body: string | null
  link: string | null
  type: string
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Only a path inside the app becomes a button; anything else is dropped. */
export function actionUrl(siteUrl: string, link: string | null): string | null {
  if (!link || !/^\/(?![/\\])/.test(link)) return null
  return `${siteUrl.replace(/\/+$/, '')}${link}`
}

export function subjectFor(p: EmailPayload): string {
  return `${p.title}${p.body ? ` — ${p.body.split(' · ')[0]}` : ''}`.slice(0, 120)
}

export function textBody(p: EmailPayload, siteUrl: string): string {
  const url = actionUrl(siteUrl, p.link)
  return [
    p.name ? `Hi ${p.name},` : 'Hi,',
    '',
    p.title,
    p.body ?? '',
    '',
    url ? `Open SiteRun: ${url}` : `Open SiteRun: ${siteUrl}`,
    '',
    'You can turn these emails off in SiteRun under Account → Privacy & Security.',
  ]
    .filter((line, i, all) => !(line === '' && all[i - 1] === ''))
    .join('\n')
}

export function htmlBody(p: EmailPayload, siteUrl: string): string {
  const url = actionUrl(siteUrl, p.link)
  const prefs = `${siteUrl.replace(/\/+$/, '')}/account/privacy`
  return `<!doctype html>
<html lang="en-AU">
  <body style="margin:0;padding:24px;background:#011020;font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#ffffff">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
      <tr><td style="padding-bottom:16px;font-size:18px;font-weight:700;letter-spacing:-0.01em">SiteRun</td></tr>
      <tr>
        <td style="background:#0a2439;border:1px solid #1a2d3e;border-radius:14px;padding:20px">
          <p style="margin:0 0 6px;font-size:13px;color:#aeb9c9">${p.name ? `Hi ${escape(p.name)},` : 'Hi,'}</p>
          <h1 style="margin:0 0 8px;font-size:20px;line-height:1.3">${escape(p.title)}</h1>
          ${p.body ? `<p style="margin:0 0 16px;font-size:15px;color:#dae4ef">${escape(p.body)}</p>` : ''}
          <a href="${escape(url ?? siteUrl)}" style="display:inline-block;background:#006cff;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">Open SiteRun</a>
        </td>
      </tr>
      <tr>
        <td style="padding-top:16px;font-size:12px;color:#7f8a9b">
          You're getting this because you have a SiteRun account.
          <a href="${escape(prefs)}" style="color:#3386ff">Turn these emails off</a>.
        </td>
      </tr>
    </table>
  </body>
</html>`
}
