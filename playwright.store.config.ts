import { defineConfig, devices } from '@playwright/test'

// Store screenshots on the in-browser demo backend, on their own port.
// Run with `npm run store:shots`; output lands in docs/store/.
export default defineConfig({
  testDir: './e2e-store',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:5176' },
  projects: [{ name: 'phone', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite --port 5176 --strictPort',
    url: 'http://localhost:5176',
    reuseExistingServer: true,
    env: { VITE_BACKEND: 'demo' },
  },
})
