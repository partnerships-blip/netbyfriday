import { defineConfig } from '@playwright/test';

const stubAI = !process.env.E2E_REAL_AI;
export default defineConfig({
  testDir: 'tests/e2e',  // the Advisor evaluation lives in tests/eval (playwright.eval.config.ts)
  timeout: 90_000,
  fullyParallel: false,
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000', trace: 'retain-on-failure' },
  webServer: process.env.E2E_BASE_URL ? undefined : [
    ...(stubAI ? [{ command: 'node tests/e2e/ai-stub.mjs', port: 4010, reuseExistingServer: true }] : []),
    { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120_000,
      // Flagged features are switched on for the e2e server so they're tested; production deployments keep them off.
      env: { NEXT_PUBLIC_NBF_FLAGS: 'contracts,taxes,invoiceLinks,contentIntel', ...(stubAI ? { AI_PROVIDER: 'anthropic', ANTHROPIC_BASE_URL: 'http://127.0.0.1:4010', ANTHROPIC_API_KEY: 'e2e-stub', AI_MODEL: 'e2e-stub' } : {}) } }
  ]
});
