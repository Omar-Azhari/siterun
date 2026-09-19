import { defineConfig, devices } from '@playwright/test'

// Audit run against the production build served by `vite preview` on port 4173
// (Supabase backend from .env).
export default defineConfig({
  testDir: './e2e-audit',
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'off' },
  projects: [{ name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }],
})
