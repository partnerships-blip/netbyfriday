import { test, expect, type Page } from '@playwright/test';

// Marking a partnership Paid records the money: open invoices are paid off and any agreed fee never invoiced
// gets an invoice and a payment. An estimated fee is never assumed; the creator says what they received.
const stamp = Date.now();
const U = { email: `creator-p-${stamp}@e2e.test`, password: 'correct-horse-battery-p' };

async function start(page: Page) {
  await page.goto('/signup');
  await page.getByLabel('Invite code').fill('E2E-TEST-01');
  await page.getByLabel('Email').fill(U.email);
  await page.getByLabel('Password').fill(U.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/onboarding');
  await page.getByLabel('Your name', { exact: false }).first().fill('Pat Test');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Get organized financially' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Go to my dashboard' }).click();
  await page.waitForURL('**/overview');
}
async function addDeal(page: Page, brand: string, fee: string, estimate = false) {
  await page.goto('/partnerships');
  await page.getByRole('button', { name: 'New partnership' }).first().click();
  await page.getByLabel('Brand', { exact: false }).first().fill(brand);
  await page.getByLabel('Fee ($)', { exact: false }).first().fill(fee);
  if (estimate) await page.getByLabel('This fee is my estimate, not an offer').check();
  await page.getByLabel('Stage').selectOption('contracted');
  await page.getByRole('button', { name: 'Add partnership' }).click();
  await page.getByRole('button', { name: new RegExp(brand) }).first().click();
}

test('marking Paid records the payment, and asks for the amount when the fee is an estimate', async ({ page }) => {
  await start(page);

  await addDeal(page, 'Paidmark Audio', '3800');
  await page.getByLabel('Stage', { exact: true }).last().selectOption('paid');
  await expect(page.getByText('Marked Paid. $3,800 recorded as received today.')).toBeVisible();
  await page.goto('/money');
  await expect(page.getByText('Paidmark Audio').first()).toBeVisible();
  await expect(page.getByText('Paid', { exact: true }).first()).toBeVisible();        // the new invoice is fully paid
  await expect(page.getByText('$3,800').first()).toBeVisible();                       // and counted as revenue received

  await addDeal(page, 'Guessworth Co', '5000', true);
  await page.getByLabel('Stage', { exact: true }).last().selectOption('paid');
  await expect(page.getByRole('heading', { name: 'How much did you receive?' })).toBeVisible();
  await page.getByLabel('Amount received ($)', { exact: false }).fill('4200');
  await page.getByRole('button', { name: 'Mark Paid and record' }).click();
  await expect(page.getByText('Marked Paid. $4,200 recorded as received today.')).toBeVisible();
  await page.goto('/money');
  await expect(page.getByText('$8,000').first()).toBeVisible();                       // 3,800 + 4,200 received
});
