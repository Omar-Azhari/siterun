import { defineConfig, devices } from '@playwright/test'

// End-to-end flows against the real Supabase backend configured in .env.
// Run with `npm run e2e:flows` after loading supabase/seed.sql.
export default defineConfig({
  testDir: './e2e-flows',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: { baseURL: 'http://localhost:5175', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: 'npx vite --port 5175 --strictPort',
    url: 'http://localhost:5175',
    reuseExistingServer: true,
  },
})
