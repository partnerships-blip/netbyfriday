import { test, expect } from '@playwright/test';

// A creator moves their spreadsheet over: columns are matched, the preview flags problems and duplicates,
// nothing is saved until they confirm, re-importing the same file adds nothing, and each import is in the history.
const U = { email: `creator-i-${Date.now()}@e2e.test`, password: 'correct-horse-battery-i' };
const DEALS = [
  'Company,Campaign Name,Rate,Status,Contact Email,Date',
  'Glowhaus,Spring Launch,"$4,500",Signed,maya@glowhaus.example,3/1/2026',
  'Northwind Audio,Podcast read,1200,Paid,,2026-02-10',
  ',Missing brand,300,,,',
  'glowhaus,spring launch,4500,Signed,,'
].join('\n');
const CONTACTS = 'Full Name,Email Address,Agency\nMaya Ortiz,maya@glowhaus.example,Glowhaus\nJon Bell,jon@northwind.example,Northwind Audio\n';

test('import partnerships and contacts from CSV with preview, duplicate checks and history', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Invite code').fill('E2E-TEST-01');
  await page.getByLabel('Email').fill(U.email);
  await page.getByLabel('Password').fill(U.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/onboarding');
  await page.getByLabel('Your name', { exact: false }).first().fill('Ivy Test');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Get organized financially' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Go to my dashboard' }).click();
  await page.waitForURL('**/overview');

  await page.goto('/partnerships');
  await page.getByRole('link', { name: 'Import CSV' }).click();
  await page.waitForURL('**/import?kind=deals');
  await page.getByLabel('CSV file').setInputFiles({ name: 'my-deals.csv', mimeType: 'text/csv', buffer: Buffer.from(DEALS) });
  await expect(page.getByLabel('Column for Brand')).toHaveValue('0');            // matched from "Company"
  await expect(page.getByLabel('Column for Fee ($)')).toHaveValue('2');          // matched from "Rate"
  await expect(page.getByText('1 ready')).toBeVisible();
  await expect(page.getByText('1 to check')).toBeVisible();
  await expect(page.getByText('1 duplicate')).toBeVisible();
  await expect(page.getByText('1 with problems')).toBeVisible();
  await expect(page.getByText('Brand is empty')).toBeVisible();
  await expect(page.getByText(/no payment is recorded/).first()).toBeVisible();   // Paid never becomes revenue on import
  await page.getByRole('button', { name: 'Import 2 partnerships' }).click();
  await expect(page.getByText('Imported 2 partnerships. Skipped 1 duplicate. 1 row had problems and was left out.').first()).toBeVisible({ timeout: 20000 });

  await page.getByRole('link', { name: 'View partnerships' }).click();
  await expect(page.getByText('Glowhaus').first()).toBeVisible();
  await expect(page.getByText('Northwind Audio').first()).toBeVisible();

  await page.goto('/import?kind=deals');                                         // same file again: nothing new
  await page.getByLabel('CSV file').setInputFiles({ name: 'my-deals.csv', mimeType: 'text/csv', buffer: Buffer.from(DEALS) });
  await expect(page.getByText('3 duplicates')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import 0 partnerships' })).toBeDisabled();
  await expect(page.getByText('2 partnerships').first()).toBeVisible();          // history entry
  await expect(page.getByText('from my-deals.csv', { exact: false }).first()).toBeVisible();

  await page.getByRole('tab', { name: 'Contacts' }).click();
  await page.getByRole('button', { name: 'Choose a different file' }).click();
  await page.getByLabel('CSV file').setInputFiles({ name: 'contacts.csv', mimeType: 'text/csv', buffer: Buffer.from(CONTACTS) });
  await page.getByRole('button', { name: 'Import 2 contacts' }).click();
  await expect(page.getByText('Imported 2 contacts.').first()).toBeVisible();
  await page.goto('/contacts');
  await expect(page.getByText('Maya Ortiz')).toBeVisible();
});
