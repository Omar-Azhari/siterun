// Builds LAUNCH-PLAN.pdf: the step-by-step list of what the owner has to do to put the
// website live and both apps in the stores. Run with `npm run plan:pdf`.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const font = (file) =>
  pathToFileURL(path.join(root, 'node_modules/@fontsource-variable/inter/files', file)).href

const PARTS = [
  {
    n: 1,
    title: 'Put the website live',
    time: 'About 2 hours',
    steps: [
      {
        h: 'Create a Vercel account',
        p: 'Go to vercel.com and sign up with the same account your code is on. Vercel is the company that will run the website.',
        done: 'You can see an empty dashboard.',
      },
      {
        h: 'Connect SiteRun to it',
        p: 'In Vercel press Add New → Project, choose the SiteRun repository, and press Import. Do not deploy yet.',
        done: 'Vercel shows the SiteRun project with a settings screen.',
      },
      {
        h: 'Add the four settings',
        p: 'On that settings screen open Environment Variables and add these four, copying the values from the .env file on your computer: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_SITE_URL (the address the site will have), VITE_PUSH_ENABLED (leave it empty for now).',
        done: 'Four rows are listed.',
      },
      {
        h: 'Press Deploy',
        p: 'Wait a couple of minutes. Vercel gives you a web address at the end.',
        done: 'Opening that address shows the SiteRun front page.',
      },
      {
        h: 'Tell Supabase the new address',
        p: 'Open supabase.com, your project, then Authentication → URL Configuration. Put your new web address in Site URL, and add it to Redirect URLs as well, with /** on the end.',
        done: 'Both boxes show your address.',
      },
      {
        h: 'Fix the sign-up email',
        p: 'Still in Supabase: Authentication → Emails → Confirm signup. Make sure the message contains {{ .Token }}, so people get the six digit code the app asks for.',
        done: 'The template preview shows a code.',
      },
      {
        h: 'Add your own email sender',
        p: "Supabase → Project Settings → Authentication → SMTP. Supabase's built-in sender only emails you, so real customers get nothing without this. Any provider works.",
        done: 'A test sign-up on your phone receives the code.',
      },
      {
        h: 'Turn on the password check',
        p: 'Supabase → Authentication → Passwords. Switch on leaked password protection, and set the minimum length to 8.',
        done: 'The switch is green.',
      },
      {
        h: 'Try it like a customer',
        p: 'On your phone, open the website, sign in with alex@acme.test and SiteRun!2026, and book a machine.',
        done: 'The booking appears under Hires.',
      },
    ],
  },
  {
    n: 2,
    title: 'Switch on money and messages',
    time: 'About half a day',
    note: 'Do this before real customers use SiteRun. Until it is done, payments are pretend and nobody gets emails or notifications.',
    steps: [
      {
        h: 'Open a Stripe account',
        p: 'Go to stripe.com, sign up as an Australian business, and stay in Test mode for now.',
        done: 'You can see the Stripe dashboard.',
      },
      {
        h: 'Give SiteRun the Stripe keys',
        p: 'Stripe → Developers → API keys. Copy the secret key into Supabase → Edge Functions → Secrets as STRIPE_SECRET_KEY. Copy the publishable key into Vercel as VITE_STRIPE_PUBLISHABLE_KEY. Also add ALLOWED_ORIGINS in Supabase, set to your website address.',
        done: 'Three settings saved.',
      },
      {
        h: 'Tell Stripe where to report back',
        p: 'Stripe → Developers → Webhooks → Add endpoint. The address is your Supabase functions address ending in /stripe-webhook (it is written in LAUNCH.md). Tick payment_intent.succeeded and setup_intent.succeeded. Copy the signing secret into Supabase as STRIPE_WEBHOOK_SECRET.',
        done: 'Stripe lists one endpoint.',
      },
      {
        h: 'Turn payments from pretend to real',
        p: 'In Supabase open the SQL editor and run the one line written in LAUNCH.md section 1, step 7. Then pay a test invoice in the app with card number 4242 4242 4242 4242.',
        done: 'The payment shows up in Stripe.',
      },
      {
        h: 'Let suppliers get paid',
        p: 'In Stripe open Connect and switch it on, choosing Express accounts. Then add your logo and colours under Connect → Settings.',
        done: 'A supplier sees a "Set Up Payouts" button in SiteRun.',
      },
      {
        h: 'Set up notifications',
        p: 'Follow LAUNCH.md section 2: a Firebase project for Android phones, and a push key from Apple for iPhones. The keys go into Supabase secrets.',
        done: 'A test booking makes your phone buzz (after the apps are installed).',
      },
      {
        h: 'Set up emails',
        p: 'Follow LAUNCH.md section 3: open a Resend account, prove you own your domain, and put the key into Supabase secrets.',
        done: 'A booking sends you an email.',
      },
      {
        h: 'Put your business details in',
        p: 'Ask your developer to fill in src/lib/company.ts: your legal business name, ABN, a contact email and a postal address. These appear on the Terms and Privacy pages the stores read.',
        done: 'Your business name shows at the bottom of the Privacy page.',
      },
      {
        h: 'Have a lawyer read the Terms and Privacy pages',
        p: 'They are written to match what SiteRun actually does, but they are not legal advice.',
        done: 'Your lawyer is happy.',
      },
    ],
  },
  {
    n: 3,
    title: 'Get the Android app into Google Play',
    time: 'A day of work, then a few days of waiting',
    steps: [
      {
        h: 'Pay for a Play developer account',
        p: 'play.google.com/console — 25 US dollars, once. Google checks who you are, which takes a few days, so start this early.',
        done: 'Google says your account is verified.',
      },
      {
        h: 'Install the build tools',
        p: 'On a Windows or Mac computer, install Android Studio and Java 21. Android Studio can install Java for you.',
        done: 'Android Studio opens without complaining.',
      },
      {
        h: 'Make your signing key',
        p: 'This is the key that proves future updates come from you. Losing it means never being able to update the app again, so save it somewhere safe. The exact command is in STORE.md under Android.',
        done: 'You have a file called siterun-release.jks, backed up.',
      },
      {
        h: 'Build the app file',
        p: 'Run the three commands in STORE.md under Android. The last one produces app-release.aab.',
        done: 'The .aab file exists.',
      },
      {
        h: 'Create the app in Play Console',
        p: 'Press Create app. Name it SiteRun, English (Australia), an app, free.',
        done: 'An empty app dashboard appears.',
      },
      {
        h: 'Fill in the shop page',
        p: 'Copy the short description, full description, screenshots and feature graphic straight out of STORE.md and the docs/store folder. Nothing needs writing from scratch.',
        done: 'The listing page is green.',
      },
      {
        h: "Answer Google's questions",
        p: 'Under App content, answer each section by copying from STORE.md: App access (the two test logins), Content rating, Data safety, target audience 18+, ads: no, and the background location form, including a short screen recording of a driver sharing their location.',
        done: 'Every section says Complete.',
      },
      {
        h: 'Test it on a real phone first',
        p: 'Upload the .aab to Internal testing, add your own email as a tester, and install SiteRun from the link Google gives you. Sign in and make a booking.',
        done: 'It works on your phone, not just on a computer.',
      },
      {
        h: 'Send it for review',
        p: 'Promote the same version from Internal testing to Production, and press Send for review.',
        done: 'Google says "In review". Approval usually takes a few days.',
      },
    ],
  },
  {
    n: 4,
    title: 'Get the iPhone app into the App Store',
    time: 'A day of work, then a few days of waiting',
    note: 'This part needs an Apple computer. If you do not have one, you can rent one online by the hour, or borrow one for a day.',
    steps: [
      {
        h: 'Join the Apple Developer Program',
        p: 'developer.apple.com — 99 US dollars a year. A business account needs a D-U-N-S number, which is free but can take a week or two. Start this first.',
        done: 'Apple says your membership is active.',
      },
      {
        h: 'Turn on Sign in with Apple',
        p: 'Apple insists on it because SiteRun offers Google sign-in. Add it to your app identifier in the Apple developer site, then switch the Apple provider on in Supabase → Authentication → Providers.',
        done: 'The Apple button on the login screen works.',
      },
      {
        h: 'Open the project on the Mac',
        p: 'Install Xcode from the Mac App Store, then run the four commands in STORE.md under iOS. The last one opens the project.',
        done: 'Xcode opens SiteRun without red errors.',
      },
      {
        h: 'Sign the app',
        p: 'In Xcode open Signing & Capabilities, choose your team from the dropdown, and check that Push Notifications and Background Modes are listed.',
        done: 'No warnings under Signing.',
      },
      {
        h: 'Create the app in App Store Connect',
        p: 'appstoreconnect.apple.com → My Apps → plus. Name SiteRun, and choose the identifier au.com.siterun.app.',
        done: 'The app appears in your list.',
      },
      {
        h: 'Fill in the shop page',
        p: 'Copy the subtitle, description, keywords and the iPhone screenshots from STORE.md and docs/store. Add the App Privacy answers from the same file.',
        done: 'Every section has a tick.',
      },
      {
        h: 'Send the build up',
        p: 'In Xcode choose Any iOS Device, then Product → Archive, then Distribute App → App Store Connect.',
        done: 'The build appears in App Store Connect after about ten minutes.',
      },
      {
        h: 'Test it on a real iPhone',
        p: 'Install it through TestFlight, sign in, make a booking, and try sharing a delivery location.',
        done: 'Everything works on the phone.',
      },
      {
        h: 'Send it for review',
        p: 'Paste the review notes from STORE.md, including the test logins, then press Add for Review. Apple normally answers within a day or two.',
        done: 'Apple says "Waiting for Review".',
      },
    ],
  },
  {
    n: 5,
    title: 'After they are live',
    time: 'Ongoing',
    steps: [
      {
        h: 'Watch the first week',
        p: 'Sign in as the platform admin and check More → App errors and More → Analytics every day or two. Errors show real problems; analytics shows what people search for and never find.',
        done: 'You know what is breaking before customers tell you.',
      },
      {
        h: 'Releasing an update',
        p: 'Your developer raises the version number, rebuilds, and uploads the same way. Both stores review updates again, usually faster.',
        done: 'The new version appears in the stores.',
      },
      {
        h: 'Move Stripe out of test mode',
        p: 'When you are ready to take real money, swap the two Stripe keys for the live ones and add a live webhook, as described at the end of LAUNCH.md section 1.',
        done: 'A real card payment lands in your Stripe balance.',
      },
    ],
  },
]

const ORDER = [
  'Apple Developer membership (needs a D-U-N-S number, up to two weeks)',
  'Google Play developer account (identity check, a few days)',
  'Website live (everything else depends on it)',
  'Stripe, notifications and emails',
  'Android app',
  'iPhone app',
]

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const html = `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Inter';
    src: url('${font('inter-latin-wght-normal.woff2')}') format('woff2-variations');
    font-weight: 100 900;
  }
  @page { size: A4; margin: 18mm 16mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Inter', system-ui, sans-serif;
    color: #10233c;
    font-size: 10pt;
    line-height: 1.45;
    -webkit-font-smoothing: antialiased;
  }
  h1 { font-size: 26pt; line-height: 1.1; margin: 0 0 6px; letter-spacing: -0.02em; }
  .lede { color: #5a6b80; font-size: 10.5pt; margin: 0 0 22px; max-width: 150mm; }
  .rule { height: 3px; width: 46px; background: #006cff; border-radius: 2px; margin: 0 0 22px; }

  .order { border: 1px solid #dfe5ec; border-radius: 10px; padding: 14px 18px; margin-bottom: 26px; }
  .order h2 { font-size: 11pt; margin: 0 0 8px; letter-spacing: 0.01em; }
  .order ol { margin: 0; padding-left: 18px; color: #3d4e63; }
  .order li { margin: 3px 0; }

  .part { margin-top: 22px; }
  .part-head { display: flex; align-items: baseline; gap: 10px; border-bottom: 1px solid #e6ebf1; padding-bottom: 8px; margin-bottom: 4px; }
  .num { font-size: 10pt; font-weight: 700; color: #006cff; letter-spacing: 0.08em; }
  .part-head h2 { font-size: 15pt; margin: 0; flex: 1; letter-spacing: -0.01em; }
  .time { font-size: 9pt; color: #7c8798; white-space: nowrap; }
  .note { background: #f4f7fb; border-left: 3px solid #006cff; padding: 9px 12px; margin: 12px 0 4px; font-size: 9.5pt; color: #3d4e63; border-radius: 0 6px 6px 0; }

  ol.steps { list-style: none; counter-reset: step; margin: 10px 0 0; padding: 0; }
  ol.steps > li { counter-increment: step; position: relative; padding: 0 0 11px 28px; break-inside: avoid; }
  ol.steps > li::before {
    content: counter(step);
    position: absolute; left: 0; top: 1px;
    width: 20px; height: 20px; border-radius: 50%;
    background: #10233c; color: #fff;
    font-size: 8.5pt; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
  }
  .step-h { font-weight: 650; font-size: 10.5pt; margin: 0 0 1px; }
  .step-p { margin: 0; color: #3d4e63; }
  .done { margin: 4px 0 0; font-size: 9pt; color: #1a7f4b; }
  .done b { font-weight: 600; }
  .foot { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e6ebf1; font-size: 9pt; color: #7c8798; }
</style>
</head>
<body>
  <h1>SiteRun launch plan</h1>
  <div class="rule"></div>
  <p class="lede">Everything that has to happen to put the website online and the apps in both stores, in order. The detail for each step is in <b>LAUNCH.md</b> and <b>STORE.md</b> in the project folder; this page tells you what to do and how to know it worked.</p>

  <div class="order">
    <h2>Start these in this order — the first two involve waiting on someone else</h2>
    <ol>${ORDER.map((o) => `<li>${esc(o)}</li>`).join('')}</ol>
  </div>

  ${PARTS.map(
    (part) => `
  <section class="part">
    <div class="part-head">
      <span class="num">PART ${part.n}</span>
      <h2>${esc(part.title)}</h2>
      <span class="time">${esc(part.time)}</span>
    </div>
    ${part.note ? `<p class="note">${esc(part.note)}</p>` : ''}
    <ol class="steps">
      ${part.steps
        .map(
          (s) => `<li>
        <p class="step-h">${esc(s.h)}</p>
        <p class="step-p">${esc(s.p)}</p>
        <p class="done"><b>Done when:</b> ${esc(s.done)}</p>
      </li>`,
        )
        .join('')}
    </ol>
  </section>`,
  ).join('')}

  <p class="foot">SiteRun · launch plan · ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
</body>
</html>`

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(html, { waitUntil: 'networkidle' })
await page.pdf({
  path: path.join(root, 'LAUNCH-PLAN.pdf'),
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="width:100%;font-family:system-ui,sans-serif;font-size:8pt;color:#9aa5b4;padding:0 16mm;text-align:right"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  margin: { top: '18mm', bottom: '16mm', left: '16mm', right: '16mm' },
})
await browser.close()

const size = (fs.statSync(path.join(root, 'LAUNCH-PLAN.pdf')).size / 1024).toFixed(0)
console.log(`Wrote LAUNCH-PLAN.pdf (${size} kB)`)
