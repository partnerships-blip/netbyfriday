import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Contract generator + e-signing (flag: agreements). The e2e server turns the flag on; where it's off, the test skips itself.
// Reading the message runs against tests/e2e/ai-stub.mjs, which answers in the shape the real model is told to use.
const stamp = Date.now();
const U = { email: `creator-g-${stamp}@e2e.test`, password: 'correct-horse-battery-g' };
const DM = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-deal-dm.txt'), 'utf8');
// A 1×1 PNG: the stub answers screenshots from the sample DM, since it can't read images.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

async function signUpAndOnboard(page: Page) {
  await page.goto('/signup');
  await page.getByLabel('Invite code').fill('E2E-TEST-01');
  await page.getByLabel('Email').fill(U.email);
  await page.getByLabel('Password').fill(U.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/onboarding');
  await page.getByLabel('Your name', { exact: false }).first().fill('Casey Test');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Get organized financially' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Go to my dashboard' }).click();
  await page.waitForURL('**/overview');
}

test('generate a contract from a DM, sign and send it, and the brand signs from the link', async ({ page, browser, request }) => {
  await signUpAndOnboard(page);
  test.skip((await page.goto('/agreements/new'))?.status() === 404, 'agreements flag is off on this deployment');

  // From the Contracts page.
  await page.goto('/contracts');
  await page.getByRole('link', { name: 'Generate a contract' }).click();
  await page.waitForURL('**/agreements/new');
  await page.getByLabel('Message text').fill(DM);
  await page.getByRole('button', { name: 'Generate contract' }).click();
  await page.waitForURL(/\/agreements\/[0-9a-f-]{36}$/);

  // The AI's proposal, each term editable, with the wording it came from. The fee is parsed by the engine.
  await expect(page.getByLabel('Brand', { exact: true })).toHaveValue('Petalwear');
  await expect(page.getByLabel('Total fee ($)')).toHaveValue('4200.00');
  await expect(page.getByLabel('Brand signer email')).toHaveValue('jordan@petalwear.test');
  await expect(page.getByLabel('Deliverable 1')).toHaveValue('1 Instagram Reel');
  await expect(page.getByText('From the message: “Budget is $4,200 total”')).toBeVisible();
  await expect(page.getByText('a total fee of $4,200 (US dollars) for the work above.')).toBeVisible();   // live preview from the template
  await expect(page.getByText('• 1 Instagram Reel: publish by December 5, 2026')).toBeVisible();

  // Edit a term: the preview follows.
  await page.getByLabel('Kill fee (if the brand cancels)').fill('50% of the fee');
  await expect(page.getByText('If Brand cancels after this Agreement is signed: 50% of the fee.')).toBeVisible();

  // Sign and send: needs your exact name and consent.
  const signBtn = page.getByRole('button', { name: 'Sign and create link' });
  await page.getByLabel('Type your full name to sign').fill('Casey Test');
  await expect(signBtn).toBeDisabled();
  await page.getByLabel('I agree to sign this agreement electronically', { exact: false }).check();
  await signBtn.click();
  await expect(page.getByText('Waiting for the brand to sign')).toBeVisible();
  const link = await page.getByLabel('Signing link').inputValue();
  expect(link).toMatch(/\/sign\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('link', { name: 'Open in my email' })).toHaveAttribute('href', /^mailto:jordan%40petalwear\.test\?subject=/);

  // The brand opens the link without an account and signs.
  const brand = await browser.newContext();
  const bp = await brand.newPage();
  await bp.goto(link);
  await expect(bp.getByText('Casey Test has signed and sent you this agreement')).toBeVisible();
  await expect(bp.getByText('If Brand cancels after this Agreement is signed: 50% of the fee.')).toBeVisible();
  await bp.getByLabel('Your full name').fill('Jordan Lee');
  await bp.getByLabel('Title (optional)').fill('Partnerships');
  await bp.getByLabel('Work email').fill('jordan@petalwear.test');
  await bp.getByLabel('Type your name to sign').fill('Jordan Lee');
  await expect(bp.getByRole('button', { name: 'Sign agreement' })).toBeDisabled();             // consent required
  await bp.getByLabel('I agree to do business electronically', { exact: false }).check();
  await bp.getByRole('button', { name: 'Sign agreement' }).click();
  await expect(bp.getByText('This agreement is signed.', { exact: false })).toBeVisible();
  await expect(bp.getByText('Audit trail')).toBeVisible();
  await expect(bp.getByText(/Brand signed · Jordan Lee \(jordan@petalwear\.test\)/)).toBeVisible();
  await expect(bp.getByText(/Document fingerprint \(SHA-256\): [0-9a-f]{64}/)).toBeVisible();
  await brand.close();

  // It can't be signed twice, and the creator sees it signed.
  const token = link.split('/sign/')[1];
  const again = await request.post(`/api/sign/${token}`, { data: { hash: '0'.repeat(64), name: 'Someone', title: '', email: 'x@y.test', signature: 'Someone', consent: true } });
  expect(again.status()).toBe(400);
  await page.reload();
  await expect(page.getByText('Signed by both')).toBeVisible();
  await expect(page.getByText('Signed by Jordan Lee', { exact: false })).toBeVisible();
  await page.goto('/contracts');
  await expect(page.getByText('Petalwear x Casey Test', { exact: true })).toBeVisible();

  // A screenshot works too (read once, not stored).
  await page.goto('/agreements/new');
  await page.getByRole('tab', { name: 'Upload a screenshot' }).click();
  await page.getByLabel('Screenshot').setInputFiles({ name: 'dm.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForURL(/\/agreements\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Read from a screenshot. Check each term against the original message.', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Brand', { exact: true })).toHaveValue('Petalwear');

  // A long email thread (3x the old 20,000-character limit) goes through and is kept on the draft.
  const filler = '\n\n---\nOn Tue, a teammate wrote:\n> Looping in finance and legal for visibility. Thanks all!\n'.repeat(700);
  const longThread = DM + filler;
  expect(longThread.length).toBeGreaterThan(60_000);
  await page.goto('/agreements/new');
  await page.getByLabel('Message text').fill(longThread);
  await page.getByRole('button', { name: 'Generate contract' }).click();
  await page.waitForURL(/\/agreements\/[0-9a-f-]{36}$/);
  await expect(page.getByLabel('Brand', { exact: true })).toHaveValue('Petalwear');
});
