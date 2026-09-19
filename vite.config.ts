/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * `vite preview` matches the Vercel rewrites: `/` serves the prerendered landing
 * (dist/index.html) and every other page route serves the app shell (dist/app.html).
 */
const appShellInPreview: Plugin = {
  name: 'app-shell-in-preview',
  configurePreviewServer(server) {
    server.middlewares.use((req, _res, next) => {
      const path = req.url?.split('?')[0] ?? '/'
      if (req.method === 'GET' && path !== '/' && !path.includes('.')) req.url = '/app.html'
      next()
    })
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss(), appShellInPreview],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, strictPort: true },
  optimizeDeps: {
    // Pre-bundle lazily imported libraries so the dev server doesn't reload mid-session.
    include: ['recharts', 'leaflet', 'react-leaflet', 'framer-motion', 'date-fns', 'zod', 'react-hook-form', '@hookform/resolvers/zod', '@react-pdf/renderer', 'tailwind-merge'],
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
