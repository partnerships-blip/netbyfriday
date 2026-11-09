import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Contract red flags: risky wording is caught by the fixed rules and explained in plain English, before anything is saved.
const stamp = Date.now();
const U = { email: `creator-rf-${stamp}@e2e.test`, password: 'correct-horse-battery-rf' };
const RISKY = fs.readFileSync(path.join(__dirname, 'fixtures', 'risky-contract.txt'), 'utf8');

test('a risky contract shows red flags with what they mean and what to ask for', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Invite code').fill('E2E-TEST-01');
  await page.getByLabel('Email').fill(U.email);
  await page.getByLabel('Password').fill(U.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/onboarding');
  await page.getByLabel('Your name', { exact: false }).first().fill('Riley Flags');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Get organized financially' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Go to my dashboard' }).click();
  await page.waitForURL('**/overview');

  await page.goto('/contracts');
  await page.getByRole('tab', { name: 'Paste text' }).click();
  await page.getByLabel('Contract text').fill(RISKY);
  await page.getByRole('button', { name: 'Read terms' }).click();
  await page.waitForURL(/\/contracts\/[0-9a-f-]{36}$/);

  const flags = page.getByLabel('Red flags');
  await expect(flags.getByText('High risk', { exact: false }).first()).toBeVisible();
  for (const title of ['Usage rights with no end date', 'Rights you can’t take back', 'You get paid only when they get paid', 'A long wait to get paid',
    'Unlimited revisions', 'The brand can cancel for any reason', 'Exclusivity that blocks other deals', 'Paid ads with your content or your handle', 'Worldwide use']) {
    await expect(flags.getByText(title, { exact: true })).toBeVisible();
  }
  // High-risk flags open with the actual wording and a plain-English explanation.
  await expect(flags.getByText('Agency will pay Creator within 15 days after receipt of payment from the Client.', { exact: false })).toBeVisible();
  await expect(flags.getByText('If the client pays late or never, so do you', { exact: false })).toBeVisible();
  await expect(flags.getByText('A set usage window (30–90 days is common for organic use)', { exact: false })).toBeVisible();
  // Watch items open on tap.
  await flags.getByText('A long wait to get paid', { exact: true }).click();
  await expect(flags.getByText('Net 30 or less, starting from your invoice', { exact: false })).toBeVisible();
  // Each term has a plain-English “What’s this?”.
  await page.getByText('What’s this?').first().click();
  await expect(page.getByText('It counts as revenue only when the money actually arrives', { exact: false })).toBeVisible();

  // Editing a term re-checks it: typing “in perpetuity” into usage on a clean contract flags it.
  await page.goto('/contracts');
  await page.getByRole('tab', { name: 'Paste text' }).click();
  await page.getByLabel('Contract text').fill('Agreement with Calm Co. Fee $500 for 1 Reel by 2026-12-01. Net 30. Usage: organic reposting for 30 days. Non-exclusive.');
  await page.getByRole('button', { name: 'Read terms' }).click();
  await page.waitForURL(/\/contracts\/[0-9a-f-]{36}$/);
  await expect(page.getByLabel('Red flags').getByText('None of the common traps we look for were found', { exact: false })).toBeVisible();
  await page.getByLabel('What the brand can do with your content').fill('Organic reposting in perpetuity');
  await expect(page.getByLabel('Red flags').getByText('Usage rights with no end date', { exact: true })).toBeVisible();
});
