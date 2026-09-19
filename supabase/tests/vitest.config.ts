import { defineConfig } from 'vitest/config'

// Separate config: these tests talk to the live Supabase project, so they stay out of `npm test`.
export default defineConfig({
  test: { environment: 'node', include: ['supabase/tests/**/*.test.ts'], testTimeout: 20000 },
})
