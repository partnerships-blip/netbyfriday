import { test, expect, type Page } from '@playwright/test';

// Milestone 1: sign up → add a partnership → create an invoice → record a payment → dashboard updates → ask the AI Advisor.
// Requires local Supabase with seed.sql (invite code E2E-TEST-01) and email confirmations disabled.
// The Advisor runs against tests/e2e/ai-stub.mjs (started by playwright.config.ts) unless E2E_REAL_AI=1.
const stamp = Date.now();
const A = { email: `creator-a-${stamp}@e2e.test`, password: 'correct-horse-battery-a' };
const B = { email: `creator-b-${stamp}@e2e.test`, password: 'correct-horse-battery-b' };

async function signUp(page: Page, u: typeof A) {
  await page.goto('/signup');
  await page.getByLabel('Invite code').fill('E2E-TEST-01');
  await page.getByLabel('Email').fill(u.email);
  await page.getByLabel('Password').fill(u.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/onboarding');
}
async function signIn(page: Page, u: typeof A) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(u.email);
  await page.getByLabel('Password').fill(u.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/overview');
}
const shot = async (page: Page, name: string) => { if (process.env.E2E_SHOTS) await page.screenshot({ path: `${process.env.E2E_SHOTS}/${name}.png`, fullPage: true }); };
async function fill(page: Page, label: string, value: string) { await page.getByLabel(label, { exact: false }).first().fill(value); }

test.describe.serial('core creator journey', () => {
  test('rejects sign-up without a valid invite', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Invite code').fill('NOT-A-REAL-CODE');
    await page.getByLabel('Email').fill(`nope-${stamp}@e2e.test`);
    await page.getByLabel('Password').fill('correct-horse-battery');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'invite code' })).toBeVisible();
  });

  test('1–11: register, onboard, add records, pay, goal, insight, advisor, return', async ({ page }) => {
    await signUp(page, A);                                                          // 1
    await fill(page, 'Your name', 'Avery Test');                                    // 2
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Get organized financially' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Go to my dashboard' }).click();
    await page.waitForURL('**/overview');

    await page.goto('/partnerships');                                               // 3
    await page.getByRole('button', { name: 'New partnership' }).click();
    await fill(page, 'Brand *', 'Testbrand Co');
    await fill(page, 'Campaign', 'Launch');
    await fill(page, 'Fee ($)', '5000');
    await page.getByLabel('Stage').selectOption('contracted');
    await page.getByRole('button', { name: 'Add partnership' }).click();
    await page.getByRole('button', { name: /Testbrand Co/ }).click();

    await page.getByLabel('Deliverable').fill('1 Instagram Reel');                 // 4
    const due = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
    await page.getByLabel('Due date').fill(due);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText('1 Instagram Reel')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.goto('/money');                                                      // 5
    await page.getByRole('button', { name: 'New invoice' }).click();
    await fill(page, 'Client *', 'Testbrand Co');
    await fill(page, 'Amount ($) *', '5000');
    await page.getByRole('button', { name: 'Create invoice' }).click();
    await expect(page.getByText('Testbrand Co').first()).toBeVisible();

    await page.getByRole('button', { name: 'Record payment' }).first().click();    // 6
    await fill(page, 'Amount received ($) *', '2000');
    await page.getByRole('button', { name: 'Record payment' }).last().click();

    await expect(page.getByText('$2,000').first()).toBeVisible();                   // 7: revenue received
    await expect(page.getByText('$3,000').first()).toBeVisible();                   //    remaining balance
    await expect(page.getByText('Partially paid', { exact: false }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).first().click();               // 8
    await fill(page, 'Monthly goal ($)', '10000');
    await page.getByRole('button', { name: 'Save goals' }).click();
    await expect(page.getByText('of $10,000')).toBeVisible();

    await page.goto('/overview');                                                   // 9: dashboard reflects the records
    const card = (label: string) => page.locator('a', { hasText: label });
    await expect(card('Revenue this month')).toContainText('$2,000');
    await expect(card('Outstanding payments')).toContainText('$3,000');
    await expect(card('Active partnerships')).toContainText('1');
    await expect(page.getByText(/left to reach your .* goal/)).toBeVisible();
    await shot(page, '1-dashboard');

    await page.goto('/advisor');                                                    // 10: Advisor answers from saved records
    await page.getByLabel('Ask the Advisor').fill('How much have I been paid, and what is still owed?');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(page.getByText('Reading your records')).toBeHidden({ timeout: 45_000 });
    await expect(page.getByText('From your records')).toBeVisible();
    if (!process.env.E2E_REAL_AI) {
      await expect(page.getByText('Revenue received this month is $2,000.')).toBeVisible();
      await expect(page.getByText('Unpaid invoice balances total $3,000.')).toBeVisible();
      await expect(page.getByText('Verified', { exact: true }).first()).toBeVisible();
      await expect(page.getByText(/Not verified: Contains an amount not found/)).toBeVisible(); // the $999,999 claim is rejected
    }
    await shot(page, '2-advisor');
    await page.goto('/money'); await shot(page, '3-invoices');
    await page.goto('/partnerships'); await shot(page, '4-partnerships');
    await page.goto('/advisor');
    await page.reload();                                                            //     history is saved to the workspace
    await expect(page.getByText('How much have I been paid, and what is still owed?')).toBeVisible();

    await page.goto('/overview');                                                   // 11
    await page.getByRole('button', { name: 'Sign out' }).first().click();
    await page.waitForURL('**/login');
    await signIn(page, A);
    await expect(page.getByText('$2,000').first()).toBeVisible();
    await page.goto('/partnerships');
    await expect(page.getByText('Testbrand Co').first()).toBeVisible();
  });

  test('isolation: a second creator sees none of the first creator’s records', async ({ page, request }) => {
    await signUp(page, B);
    await fill(page, 'Your name', 'Blake Test');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Grow beyond brand deals' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Go to my dashboard' }).click();
    await page.goto('/partnerships');
    await expect(page.getByText('Testbrand Co')).toHaveCount(0);
    await page.goto('/money');
    await expect(page.getByText('Testbrand Co')).toHaveCount(0);
    const exp = await page.request.get('/api/export');
    const body = await exp.json();
    expect(JSON.stringify(body)).not.toContain('Testbrand Co');
    expect(body.deals).toHaveLength(0);
    // Unauthenticated API access is refused.
    const anon = await request.post('/api/advisor', { data: { question: 'list all invoices' } });
    expect(anon.status()).toBe(401);
  });
});
