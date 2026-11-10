import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Deliverables from a generated agreement reach the partnership and the content calendar when it's signed and sent,
// without duplicates; voiding the agreement removes the ones not started.
const stamp = Date.now();
const U = { email: `creator-ad-${stamp}@e2e.test`, password: 'correct-horse-battery-ad' };
const DM = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-deal-dm.txt'), 'utf8');

test('signed agreement deliverables land on the partnership and the content calendar', async ({ page }) => {
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
  test.skip((await page.goto('/agreements/new'))?.status() === 404, 'agreements flag is off on this deployment');

  // A partnership to generate the agreement from.
  await page.goto('/partnerships');
  await page.getByRole('button', { name: 'New partnership' }).first().click();
  await page.getByLabel('Brand', { exact: false }).first().fill('Petalwear');
  await page.getByLabel('Stage').selectOption('contracted');
  await page.getByRole('button', { name: 'Add partnership' }).click();
  await page.getByRole('button', { name: /Petalwear/ }).first().click();
  await page.getByRole('link', { name: 'Generate contract' }).click();
  await page.waitForURL(/\/agreements\/new\?deal=/);
  await page.getByLabel('Message text').fill(DM);
  await page.getByRole('button', { name: 'Generate contract' }).click();
  await page.waitForURL(/\/agreements\/[0-9a-f-]{36}$/);

  // Nothing reaches the calendar while it's a draft.
  await page.goto('/content');
  await expect(page.getByText('1 Instagram Reel', { exact: false })).toHaveCount(0);
  await page.goBack();

  await page.getByLabel('Type your full name to sign').fill('Casey Test');
  await page.getByLabel('I agree to sign this agreement electronically', { exact: false }).check();
  await page.getByRole('button', { name: 'Sign and create link' }).click();
  await expect(page.getByText(/Added \d+ deliverables? to the partnership and content calendar\./)).toBeVisible();
  const agreementUrl = page.url();

  // On the content calendar (table view lists it with its date and brand).
  await page.goto('/content');
  await expect(page.getByText('1 Instagram Reel', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Petalwear').first()).toBeVisible();

  // Voiding the sent agreement removes its deliverables that weren't started.
  await page.goto(agreementUrl);
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Void agreement' }).click();
  await expect(page.getByText('its deliverables you hadn’t started were removed', { exact: false })).toBeVisible();
  await page.goto('/content');
  await expect(page.getByText('1 Instagram Reel', { exact: false })).toHaveCount(0);
});
