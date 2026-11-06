import { test, expect } from '@playwright/test';

// Creator-specific details: a gifted collaboration keeps its product value as non-cash (never revenue) and marking it
// Paid asks for nothing; a deliverable tracks platform, submission, revisions, publish date and the live link.
const U = { email: `creator-g-${Date.now()}@e2e.test`, password: 'correct-horse-battery-g' };

test('gifted collaboration and deliverable workflow', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Invite code').fill('E2E-TEST-01');
  await page.getByLabel('Email').fill(U.email);
  await page.getByLabel('Password').fill(U.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/onboarding');
  await page.getByLabel('Your name', { exact: false }).first().fill('Gia Test');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Get organized financially' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Go to my dashboard' }).click();
  await page.waitForURL('**/overview');

  await page.goto('/partnerships');
  await page.getByRole('button', { name: 'New partnership' }).first().click();
  await page.getByLabel('Brand', { exact: false }).first().fill('Petalwear');
  await page.getByLabel('Partnership type').selectOption('gifted');
  await page.getByLabel('Gifted product value', { exact: false }).fill('480');
  await page.getByLabel('Stage').selectOption('contracted');
  await page.getByRole('button', { name: 'Add partnership' }).click();
  await page.getByRole('button', { name: /Petalwear/ }).first().click();
  await expect(page.getByText('Gifted collaboration')).toBeVisible();
  await expect(page.getByText('$480 · non-cash, not revenue')).toBeVisible();
  await expect(page.getByText('Not set')).toBeVisible();                                  // payment clock never assumed

  await page.getByLabel('Deliverable').fill('1 TikTok try-on');
  await page.getByLabel('Due date', { exact: true }).fill('2026-12-10');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Edit 1 TikTok try-on' }).click();
  await page.getByLabel('Platform').fill('TikTok');
  await page.getByLabel('Revision rounds so far').fill('1');
  await page.getByLabel('Submitted on').fill('2026-12-01');
  await page.getByLabel('Published on').fill('2026-12-09');
  await page.getByLabel('Link to the live post').fill('not a link');
  await page.getByRole('button', { name: 'Save deliverable' }).click();
  await expect(page.getByText('Use a full link starting with https://').first()).toBeVisible();
  await page.getByLabel('Link to the live post').fill('https://www.tiktok.com/@gia/video/123');
  await page.getByRole('button', { name: 'Save deliverable' }).click();
  await expect(page.getByText(/Submitted Dec 1 · 1 revision · Published Dec 9/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'View post' })).toHaveAttribute('href', 'https://www.tiktok.com/@gia/video/123');

  await page.getByLabel('Stage', { exact: true }).last().selectOption('paid');           // nothing to ask: no cash in this deal
  await expect(page.getByRole('heading', { name: 'How much did you receive?' })).toHaveCount(0);
  await page.goto('/money');
  await expect(page.getByText('Revenue received').first()).toBeVisible();
  await expect(page.locator('text=$480')).toHaveCount(0);                                  // gifted value is never revenue
});
