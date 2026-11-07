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

    // Insights screenshot: read, shown for review, saved only after confirming.
    await page.getByLabel('Insights screenshot').setInputFiles(fx('sample-insights.png'));
    await expect(page.getByRole('heading', { name: 'Check the numbers' })).toBeVisible({ timeout: 30000 });
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByLabel('These numbers cover *')).toHaveValue('24h');           // from "Last 24 hours"
    await expect(dlg.getByLabel('Views')).toHaveValue('2599');
    await expect(dlg.getByLabel('Accounts reached')).toHaveValue('1842');
    await expect(dlg.getByLabel('Avg. watch time (sec)')).toHaveValue('4.2');
    await expect(dlg.getByLabel('Skip rate (%)')).toHaveValue('41.8');
    await expect(dlg.getByLabel('Link clicks')).toHaveValue('');                       // not in the screenshot: stays blank
    await expect(dlg.getByText('Not in the screenshot').first()).toBeVisible();
    await dlg.getByLabel('Saves').fill('49');                                           // the creator can correct anything
    await dlg.getByRole('button', { name: 'Confirm and save' }).click();
    await expect(page.getByText('Metrics confirmed and saved').first()).toBeVisible();
    await expect(page.getByRole('cell', { name: '1,842' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '49', exact: true })).toBeVisible();
    await expect(page.getByText('From your screenshot').first()).toBeVisible();

    // Checking again reuses the saved reading: no second AI call.
    await page.getByRole('button', { name: 'Check the numbers' }).first().click();
    await expect(page.getByRole('heading', { name: 'Check the numbers' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

    // A picture that isn't an analytics screen is not turned into numbers.
    await page.getByLabel('Insights screenshot').setInputFiles(fx('not-insights.jpg'));
    await expect(page.getByRole('heading', { name: 'We couldn’t read this screenshot' })).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Enter by hand' }).click();

    // A later check-in by hand is kept alongside the first.
    await page.getByLabel('These numbers cover').selectOption('7d'); await page.getByLabel('Views').fill('9120');
    await page.getByRole('button', { name: 'Save metrics' }).click();
    await expect(page.getByRole('cell', { name: '9,120' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '2,599' })).toBeVisible();          // the 24-hour check-in is still there
    await expect(page.getByText('Entered by you').first()).toBeVisible();

    // Creative review: grounded in the frames and text; an ungrounded claim from the model is removed, and says so.
    await page.getByRole('button', { name: 'Run creative review' }).click();
    await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/, { timeout: 60000 });
    const reviewUrl = page.url();
    await expect(page.getByRole('heading', { name: 'Creative review', level: 1 })).toBeVisible();
    await expect(page.getByText('What’s working')).toBeVisible();
    await expect(page.getByText('Based on: Frame at 0.5s').first()).toBeVisible();
    await expect(page.getByText('300% more reach')).toHaveCount(0);
    await page.getByText('Data limitations').click();
    await expect(page.getByText('1 statement was left out because it couldn’t be checked against what you provided.')).toBeVisible();
    await expect(page.getByText(/still frames \(0.5s, 1.5s, 3s/)).toBeVisible();
    await page.getByRole('button', { name: 'Save analysis' }).click();
    await expect(page.getByRole('button', { name: 'Saved ✓' })).toBeVisible();

    // Follow-up conversation: answers are checked; suggestions can be saved as ideas or tasks, only on click.
    await page.getByRole('button', { name: 'Give me three stronger hooks' }).click();
    await expect(page.getByText('Here are three openings that put the result first.')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('70% better retention')).toHaveCount(0);                    // unsupported number removed
    await expect(page.getByText(/part was left out/)).toBeVisible();
    await page.getByRole('button', { name: 'Save as idea' }).first().click();
    await expect(page.getByText('Saved as idea')).toBeVisible();
    await page.getByRole('button', { name: 'Save as task' }).first().click();
    await expect(page.getByText('Added to tasks')).toBeVisible();
    await page.reload();                                                                      // the conversation is kept
    await expect(page.getByText('Here are three openings that put the result first.')).toBeVisible();

    // Same inputs again: the saved analysis is reused, no new AI call.
    await page.getByRole('link', { name: /Holiday glow in 3 steps/ }).click();
    await page.getByRole('button', { name: 'Run creative review' }).click();
    await page.waitForURL(reviewUrl);
    await expect(page.getByText('Nothing has changed since the last analysis').first()).toBeVisible();

    // Performance check-in with no comparable history: the numbers, and a plain statement that there's nothing to compare yet.
    await page.getByRole('link', { name: /Holiday glow in 3 steps/ }).click();
    await page.getByLabel('Numbers to analyze').selectOption({ label: /24 hours/ } as any).catch(async () => {
      const opt = await page.getByLabel('Numbers to analyze').locator('option', { hasText: '24 hours' }).getAttribute('value'); await page.getByLabel('Numbers to analyze').selectOption(opt!); });
    await page.getByRole('button', { name: 'Run check-in' }).click();
    await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/, { timeout: 60000 });
    await expect(page.getByRole('heading', { name: '24-hour check-in', level: 1 })).toBeVisible();
    await expect(page.getByText('Not enough historical content has been added to calculate a reliable comparison yet.').first()).toBeVisible();
    await expect(page.getByText('2,599').first()).toBeVisible();
    await expect(page.getByText('What needs attention')).toBeVisible();
    await page.getByLabel('Ask about this analysis').fill('Why do you think people skipped this video?');
    await page.getByRole('button', { name: 'Send question' }).click();
    await expect(page.getByText(/A skip rate of 41.8% means a good share of viewers left early/)).toBeVisible({ timeout: 30000 });

    // Business impact: link an existing partnership. Agreed fees and money received stay separate; nothing is claimed as caused.
    await page.goto('/partnerships');
    await page.getByRole('button', { name: 'New partnership' }).first().click();
    await page.getByLabel('Brand', { exact: false }).first().fill('Lumen Skincare');
    await page.getByLabel('Fee ($)', { exact: false }).first().fill('3200');
    await page.getByLabel('Stage').selectOption('contracted');
    await page.getByRole('button', { name: 'Add partnership' }).click();
    await expect(page.getByText('Lumen Skincare').first()).toBeVisible();
    await page.goto(itemUrl);
    await page.getByLabel('Link to a partnership or income').selectOption({ label: 'Lumen Skincare · $3,200' });
    await page.getByRole('button', { name: 'Link', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Lumen Skincare' })).toBeVisible();
    await expect(page.getByText('Agreed fees (contracted)')).toBeVisible();
    await expect(page.getByText('$3,200').first()).toBeVisible();
    await expect(page.getByText('Received so far')).toBeVisible();
    await page.getByRole('button', { name: 'Run business impact' }).click();
    await page.waitForURL(/\/analysis\/[0-9a-f-]{36}$/, { timeout: 60000 });
    await expect(page.getByRole('heading', { name: 'Business impact', level: 1 })).toBeVisible();
    await expect(page.getByText('$3,200 in agreed fees (contracted, not all received)')).toBeVisible();
    await expect(page.getByText('$0 received so far')).toBeVisible();
    await page.getByText('Data limitations').click();
    await expect(page.getByText(/not that it caused those deals or sales/)).toBeVisible();

    // Coming back later: the saved analysis is listed on the item.
    await page.goto('/content-intelligence');
    await page.getByRole('link', { name: /Holiday glow in 3 steps/ }).first().click();
    await expect(page.getByText('Past analyses')).toBeVisible();
    await expect(page.getByRole('link', { name: /Creative review.*Saved/ })).toBeVisible();
    await expect(page.getByText('Saved ideas')).toBeVisible();
    await expect(page.getByText('Open on the finished glow, then: “This takes 3 steps.”')).toBeVisible();
    await page.goto('/tasks');
    await expect(page.getByText('“Your skin, but holiday-party ready.” Close-up first, title second.').first()).toBeVisible();

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
