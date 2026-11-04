import { defineConfig } from '@playwright/test';
// Advisor evaluation against a deployed site with the real AI provider. See tests/eval/advisor.eval.spec.ts.
export default defineConfig({ testDir: 'tests/eval', timeout: 20 * 60_000, use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000' } });
