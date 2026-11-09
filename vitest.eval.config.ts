import { defineConfig } from 'vitest/config';
import path from 'node:path';
// Contract reading + contract generator evaluation against the REAL AI provider. See tests/eval/contracts.eval.test.ts.
export default defineConfig({
  test: { include: ['tests/eval/**/*.eval.test.ts'], environment: 'node', testTimeout: 15 * 60_000 },
  resolve: { alias: { '@': path.resolve(__dirname, '.'), 'server-only': path.resolve(__dirname, 'tests/server-only-stub.ts') } }
});
