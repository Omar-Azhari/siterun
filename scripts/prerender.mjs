// After `vite build`: bake the landing page's HTML into dist/index.html so `/` paints
// before any JavaScript runs (the client hydrates it), and keep a clean shell at
// dist/app.html for every other route.
import { readFileSync, writeFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { Route, Routes } from 'react-router-dom'
import { StaticRouter } from 'react-router'
import { createServer } from 'vite'

const shell = readFileSync('dist/index.html', 'utf8')
writeFileSync('dist/app.html', shell)

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})
const { LandingPage } = await vite.ssrLoadModule('/src/pages/marketing/LandingPage.tsx')
// Same tree as src/pages/marketing/landingRoot.tsx, so hydration matches.
const html = renderToString(
  createElement(
    StaticRouter,
    { location: '/' },
    createElement(
      Routes,
      null,
      createElement(Route, { path: '/', element: createElement(LandingPage) }),
      createElement(Route, { path: '*', element: null }),
    ),
  ),
)
await vite.close()

// Signed-in visitors and the native apps go straight to the app: hide the baked landing
// until React replaces it. Kept in a file, not inline, so the CSP can ban inline scripts.
const boot = `try{var k=Object.keys(localStorage).concat(Object.keys(sessionStorage));if(window.Capacitor||k.some(function(x){return /^sb-.+-auth-token$/.test(x)||x==='siterun-demo-session'}))document.documentElement.classList.add('app-boot')}catch(e){}`
writeFileSync('dist/boot.js', boot)
const guard = `<script src="/boot.js"></script><style>.app-boot #root>*{visibility:hidden}</style>`

writeFileSync(
  'dist/index.html',
  shell
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`)
    .replace('</head>', `    ${guard}\n  </head>`),
)
console.log(`Prerendered landing (${Math.round(html.length / 1024)} kB of HTML)`)
