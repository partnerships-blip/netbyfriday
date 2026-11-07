import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Content Intelligence with real files: a real 8-second MP4 and a real insights screenshot (tests/e2e/fixtures).
// Skips itself where the contentIntel flag is off (production until the founder turns it on).
const stamp = Date.now();
const A = { email: `creator-ci-${stamp}@e2e.test`, password: 'correct-horse-battery-ci' };
const B = { email: `creator-cj-${stamp}@e2e.test`, password: 'correct-horse-battery-cj' };
const fx = (f: string) => path.join(__dirname, 'fixtures', f);
let itemUrl = '';

async function signUp(page: Page, u: { email: string; password: string }) {
  await page.goto('/signup');
  await page.getByLabel('Invite code').fill('E2E-TEST-01');
  await page.getByLabel('Email').fill(u.email);
  await page.getByLabel('Password').fill(u.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/onboarding');
  await page.getByLabel('Your name', { exact: false }).first().fill('Cora Test');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Get organized financially' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Go to my dashboard' }).click();
  await page.waitForURL('**/overview');
}

test.describe.serial('content intelligence', () => {
  test('library, link entry, real video upload with frames, invalid files, screenshot, metrics history', async ({ page }) => {
    await signUp(page, A);
    test.skip((await page.goto('/content-intelligence'))?.status() === 404, 'contentIntel flag is off on this deployment');
    await expect(page.getByRole('heading', { name: 'Start with one post you care about.' })).toBeVisible();
    await page.getByRole('button', { name: 'Add your first post' }).click();
    await page.getByLabel('Link to the post', { exact: false }).fill('https://www.tiktok.com/@cora.test/video/7301234567890123456?lang=en');
    await expect(page.getByLabel('Platform')).toHaveValue('tiktok');                     // detected from the link
    await page.getByLabel('Title').fill('Holiday glow in 3 steps');
    await page.getByLabel('Category').fill('Beauty');
    await page.getByLabel('What happens in it').fill('Opens on the finished look, then serum and glow drops.');
    await page.getByRole('button', { name: 'Add to library' }).click();
    await page.waitForURL(/\/content-intelligence\/[0-9a-f-]{36}$/);
    itemUrl = page.url();
    await expect(page.getByRole('heading', { name: 'Holiday glow in 3 steps' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Open on TikTok/ })).toHaveAttribute('href', 'https://www.tiktok.com/@cora.test/video/7301234567890123456');

    // A text file renamed to .mp4 is refused by the server's signature check, and nothing is kept.
    await page.getByLabel('Video or image file').setInputFiles({ name: 'fake.mp4', mimeType: 'video/mp4', buffer: Buffer.from('this is not a video, just text pretending'.repeat(4)) });
    await expect(page.getByText('That file isn’t a real video or image of the type it claims to be.').first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('video')).toHaveCount(0);
    // A GIF is refused before upload.
    await page.getByLabel('Video or image file').setInputFiles({ name: 'a.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') });
    await expect(page.getByText('Upload an MP4 or MOV video, or a JPEG, PNG or WEBP image.').first()).toBeVisible();

    // The real video: uploaded privately, then frames are sampled in the browser for the review.
    await page.getByLabel('Video or image file').setInputFiles(fx('sample-reel.mp4'));
    await expect(page.getByText('Video uploaded').first()).toBeVisible({ timeout: 60000 });
    await expect(page.locator('video[aria-label="Uploaded video"]')).toBeVisible();
    await expect(page.getByText('Frames the review looks at')).toBeVisible();
    await expect(page.getByRole('img', { name: /Frame at 0.5s/ })).toBeVisible();
    expect(await page.getByRole('img', { name: /^Frame at / }).count()).toBeGreaterThanOrEqual(5);
    await expect(page.getByText('Length')).toBeVisible(); await expect(page.getByText('8s', { exact: true })).toBeVisible();

    await page.getByLabel('Insights screenshot').setInputFiles(fx('sample-insights.png'));
    await expect(page.getByText('Screenshot added').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('img', { name: 'Insights screenshot' })).toBeVisible();

    // Metrics by hand: blanks stay blank; a second check-in is kept alongside the first.
    await page.getByRole('button', { name: 'Add metrics' }).click();
    await page.getByLabel('Views').fill('2599'); await page.getByLabel('Shares').fill('26'); await page.getByLabel('Skip rate (%)').fill('41.8');
    await page.getByRole('button', { name: 'Save metrics' }).click();
    await expect(page.getByRole('cell', { name: '2,599' })).toBeVisible();
    await page.getByRole('button', { name: 'Add metrics' }).click();
    await page.getByLabel('These numbers cover').selectOption('7d'); await page.getByLabel('Views').fill('9120');
    await page.getByRole('button', { name: 'Save metrics' }).click();
    await expect(page.getByRole('cell', { name: '9,120' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '2,599' })).toBeVisible();          // the 24-hour check-in is still there
    await expect(page.getByText('Entered by you').first()).toBeVisible();

    await page.goto('/content-intelligence');
    await expect(page.getByText('Holiday glow in 3 steps')).toBeVisible();
    await expect(page.getByText('9,120 views · 7 days').first()).toBeVisible();      // latest measurement on the card
    await page.getByRole('tab', { name: 'table' }).click();
    await expect(page.getByRole('cell', { name: 'Beauty' })).toBeVisible();
  });

  test('another creator cannot open the item', async ({ page }) => {
    test.skip(!itemUrl, 'previous test skipped');
    await signUp(page, B);
    const res = await page.goto(itemUrl);
    expect(res?.status()).toBe(404);
    await page.goto('/content-intelligence');
    await expect(page.getByText('Holiday glow in 3 steps')).toHaveCount(0);
  });
});
