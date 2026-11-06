import { test, expect } from '@playwright/test';

// New workspaces get a setup checklist on the dashboard. Progress comes from records; optional steps can be skipped;
// the card can be hidden. Empty pages explain the feature and offer a working first action.
const U = { email: `creator-s-${Date.now()}@e2e.test`, password: 'correct-horse-battery-s' };

test('setup checklist: progress from records, skip, hide, and empty states with working actions', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Invite code').fill('E2E-TEST-01');
  await page.getByLabel('Email').fill(U.email);
  await page.getByLabel('Password').fill(U.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/onboarding');
  await page.getByLabel('Your name', { exact: false }).first().fill('Sam Test');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Get organized financially' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Go to my dashboard' }).click();
  await page.waitForURL('**/overview');

  await expect(page.getByRole('heading', { name: 'Set up your workspace' })).toBeVisible();
  await expect(page.getByText('0 of 5 done')).toBeVisible();

  await page.getByRole('button', { name: 'Add a partnership' }).click();
  await page.getByLabel('Brand', { exact: false }).first().fill('Checklist Co');
  await page.getByRole('button', { name: 'Add partnership' }).click();
  await expect(page.getByText(/2 of 5 done/)).toBeVisible();      // the partnership, and its brand

  await expect(page.getByRole('heading', { name: 'Finish setting up' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip' }).last().click();      // skip "Ask the AI Advisor"
  await expect(page.getByText('3 of 5 done')).toBeVisible();

  await page.getByRole('button', { name: 'Hide', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Set up your workspace|Finish setting up/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Set up your workspace|Finish setting up/ })).toHaveCount(0);

  await page.goto('/tasks');
  await page.getByRole('button', { name: 'Add a task' }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'New task' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/money');
  await expect(page.getByText('No invoices yet.').first()).toBeVisible();
  await page.getByRole('button', { name: 'Create your first invoice' }).first().click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'New invoice' })).toBeVisible();
});
