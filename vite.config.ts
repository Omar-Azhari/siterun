/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * `vite preview` matches the Vercel rewrites: `/` serves the prerendered landing
 * (dist/index.html) and every other page route serves the app shell (dist/app.html).
 */
const appShellInPreview: Plugin = {
  name: 'app-shell-in-preview',
  configurePreviewServer(server) {
    // Same response headers Vercel sends, so the CSP is exercised locally too.
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      headers: { source: string; headers: { key: string; value: string }[] }[]
    }
    const globalHeaders = vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? []
    server.middlewares.use((_req, res, next) => {
      for (const h of globalHeaders) res.setHeader(h.key, h.value)
      next()
    })
    server.middlewares.use((req, _res, next) => {
      const path = req.url?.split('?')[0] ?? '/'
      if (req.method === 'GET' && path !== '/' && !path.includes('.')) req.url = '/app.html'
      next()
    })
  },
}

const APP_VERSION = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  plugins: [
    react(),
    tailwindcss(),
    appShellInPreview,
    // Service worker for the web app (registered in main.tsx, never inside Capacitor).
    // Uses public/site.webmanifest. Heavy lazy chunks (PDF, charts, maps) are cached on
    // first use instead of precached.
    VitePWA({
      injectRegister: null,
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,png,ico,webmanifest}'],
        globIgnores: ['**/react-pdf*', '**/PerformancePage*', '**/og-image.png'],
        maximumFileSizeToCacheInBytes: 600 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/$/, /^\/dev\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/images/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'photos',
              expiration: { maxEntries: 120, maxAgeSeconds: 30 * 86400 },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: { cacheName: 'lazy-chunks', expiration: { maxEntries: 80 } },
          },
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith('supabase.co') &&
              url.pathname.includes('/storage/v1/object/public/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'uploads',
              expiration: { maxEntries: 150, maxAgeSeconds: 30 * 86400 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // Keep fonts as files: a small woff2 inlined as a data: URL would need
    // `font-src data:` in the Content-Security-Policy.
    assetsInlineLimit: (file) => (/\.(woff2?|ttf|otf|eot)$/.test(file) ? false : undefined),
  },
  server: { port: 5173, strictPort: true },
  optimizeDeps: {
    // Pre-bundle lazily imported libraries so the dev server doesn't reload mid-session.
    include: [
      'recharts',
      'leaflet',
      'react-leaflet',
      'framer-motion',
      'date-fns',
      'zod',
      'react-hook-form',
      '@hookform/resolvers/zod',
      '@react-pdf/renderer',
      'tailwind-merge',
    ],
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/_shared/**/*.test.ts'],
  },
})
