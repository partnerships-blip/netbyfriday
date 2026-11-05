import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Flagged features (contracts, taxes, invoiceLinks). The e2e dev server turns the flags on; on a deployment where a flag
// is off (production, today), that feature's test skips itself instead of failing.
// Contract reading runs against tests/e2e/ai-stub.mjs, which answers in the shape the real model is told to use.
const stamp = Date.now();
const U = { email: `creator-c-${stamp}@e2e.test`, password: 'correct-horse-battery-c' };
const CONTRACT = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-contract.txt'), 'utf8');

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

test.describe.serial('contracts, taxes and invoice links', () => {
  test('read a contract, review the quoted terms, confirm into a partnership with deliverables and reminders', async ({ page }) => {
    await signUpAndOnboard(page);
    test.skip((await page.goto('/contracts'))?.status() === 404, 'contracts flag is off on this deployment');
    await page.getByRole('tab', { name: 'Paste text' }).click();
    await page.getByLabel('Contract text').fill(CONTRACT);
    await page.getByRole('button', { name: 'Read terms' }).click();
    await page.waitForURL(/\/contracts\/[0-9a-f-]{36}$/);

    await expect(page.getByRole('heading', { name: 'Marigold Holiday Glow' })).toBeVisible();
    await expect(page.getByLabel('Brand', { exact: true })).toHaveValue('Marigold Beauty Co.');
    await expect(page.getByLabel('Total fee ($)')).toHaveValue('6500.00');                 // parsed by the engine, not the model
    await expect(page.getByText('“total fee of $6,500.00”')).toBeVisible();              // the wording it came from
    await expect(page.getByText('From the contract', { exact: true }).first()).toBeVisible(); // quote found in the text
    await expect(page.locator('input[aria-label="Deliverable"]')).toHaveCount(3);

    // Usage runs 90 days from the first post: the creator gives the date, the engine computes the end.
    await page.locator('input[type=date]').nth(1).fill('2026-11-20');
    await page.getByRole('button', { name: /Set end to 90 days after start \(Feb 18\)/ }).click();
    await expect(page.locator('input[type=date]').nth(2)).toHaveValue('2027-02-18');

    await expect(page.getByLabel('Campaign name')).toHaveValue('Marigold Holiday Glow');   // no partnerships yet, so a new one is the default
    await page.getByRole('button', { name: 'Confirm contract' }).click();
    await page.waitForURL('**/contracts');
    await expect(page.getByText('Confirmed').first()).toBeVisible();
    await expect(page.getByText('Paid social on Meta and TikTok, plus organic reposting')).toBeVisible();

    await page.goto('/tasks');
    await expect(page.getByText('Usage rights end Feb 18: Marigold Beauty Co.')).toBeVisible();
    await page.goto('/partnerships');
    await expect(page.getByText('Marigold Holiday Glow').first()).toBeVisible();
  });

  test('taxes: cash-basis totals and a saved set-aside rate', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(U.email); await page.getByLabel('Password').fill(U.password);
    await page.getByRole('button', { name: 'Sign in' }).click(); await page.waitForURL('**/overview');

    await page.goto('/money');
    await page.getByRole('button', { name: 'Record income' }).click();
    await page.getByLabel('Amount received ($)', { exact: false }).first().fill('4000');
    await page.getByRole('button', { name: 'Add income' }).click();
    await expect(page.getByText('$4,000').first()).toBeVisible();

    test.skip((await page.goto('/taxes'))?.status() === 404, 'taxes flag is off on this deployment');
    await expect(page.getByText('$4,000').first()).toBeVisible();          // money received
    await expect(page.getByText('$1,000').first()).toBeVisible();          // 25% default set-aside
    await page.getByLabel('Set-aside percentage').fill('30');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Set aside (30%)')).toBeVisible();
    await expect(page.getByText('$1,200').first()).toBeVisible();
  });

  test('send an invoice: private link, brand view without signing in, link can be turned off', async ({ page, browser }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(U.email); await page.getByLabel('Password').fill(U.password);
    await page.getByRole('button', { name: 'Sign in' }).click(); await page.waitForURL('**/overview');

    await page.goto('/money');
    await page.getByRole('button', { name: 'New invoice' }).click();
    await page.getByLabel('Client *', { exact: false }).first().fill('Marigold Beauty Co.');
    await page.getByLabel('Amount ($) *', { exact: false }).first().fill('3250');
    await page.getByRole('button', { name: 'Create invoice' }).click();
    await expect(page.getByText('Marigold Beauty Co.').first()).toBeVisible();
    test.skip(await page.getByRole('button', { name: 'Send', exact: true }).count() === 0, 'invoiceLinks flag is off on this deployment');
    await page.getByRole('button', { name: 'Send', exact: true }).first().click();
    const preview = page.locator('dialog a', { hasText: 'Preview' });
    await expect(preview).toBeVisible();
    const link = (await preview.getAttribute('href'))!;
    await page.getByLabel('Payment details').fill('ACH or PayPal. Details on request.');
    await page.getByRole('button', { name: 'Save details' }).click();
    await expect(page.locator('dialog textarea').first()).toHaveValue(/Marigold|Here’s invoice/);

    const anon = await (await browser.newContext()).newPage();               // the brand: no session
    await anon.goto(link);
    await expect(anon.getByRole('heading', { name: 'Invoice' })).toBeVisible();
    await expect(anon.getByText('Marigold Beauty Co.')).toBeVisible();
    await expect(anon.getByText('$3,250').first()).toBeVisible();
    await expect(anon.getByText('ACH or PayPal. Details on request.')).toBeVisible();

    await page.getByRole('button', { name: 'Copy message' }).click();        // marks it sent
    await expect(page.getByText('Copied and marked as sent')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.getByText(/^Sent /).first()).toBeVisible();
    await page.getByRole('button', { name: 'Resend' }).first().click();
    await page.getByRole('button', { name: 'Turn off link' }).click();
    await expect(page.getByText('Link turned off').first()).toBeVisible();
    await anon.reload();
    await expect(anon.getByText('Invoice from')).toHaveCount(0);           // the old link no longer works
  });
});
