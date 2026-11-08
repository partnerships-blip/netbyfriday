import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Delete my account (Settings): typed-email confirmation, then the workspace, records, files and login are gone.
const stamp = Date.now();
const U = { email: `creator-del-${stamp}@e2e.test`, password: 'correct-horse-battery-del' };
const CONTRACT = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-contract.txt'), 'utf8');

test('delete my account from Settings', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Invite code').fill('E2E-TEST-01');
  await page.getByLabel('Email').fill(U.email);
  await page.getByLabel('Password').fill(U.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/onboarding');
  await page.getByLabel('Your name', { exact: false }).first().fill('Dana Delete');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Get organized financially' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Go to my dashboard' }).click();
  await page.waitForURL('**/overview');

  // Something to delete: an uploaded contract (stored file + record).
  const up = await page.request.post('/api/contracts', { multipart: { file: { name: 'c.txt', mimeType: 'text/plain', buffer: Buffer.from(CONTRACT) } } });
  expect(up.ok()).toBe(true);

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Delete my account' }).click();
  const confirm = page.getByRole('button', { name: 'Permanently delete my account' });
  await expect(confirm).toBeDisabled();
  await page.getByLabel(`Type ${U.email} to confirm`).fill('someone@else.test');
  await expect(confirm).toBeDisabled();                                        // must be your own email
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Delete my account' }).click();
  await page.getByLabel(`Type ${U.email} to confirm`).fill(U.email.toUpperCase());
  await confirm.click();

  await page.waitForURL('**/login?deleted=1');
  await expect(page.getByText('Your account and all of its records have been deleted.')).toBeVisible();
  await page.goto('/overview');
  await page.waitForURL(/\/login/);                                             // signed out

  // The login is gone too.
  await page.goto('/login');
  await page.getByLabel('Email').fill(U.email);
  await page.getByLabel('Password').fill(U.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
