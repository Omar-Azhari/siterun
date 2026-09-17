/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
