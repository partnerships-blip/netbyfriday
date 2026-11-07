import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { demoData } from '../../lib/demo/fixture';
import { compute, formatCents } from '../../lib/finance/core.js';

const m: any = compute(demoData().input);
const stamp = Date.now();

test.describe.serial('public site and waitlist', () => {
  test('home page renders figures calculated from the sample records', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);                                         // signed-out visitors are not sent to /login
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Meet the workspace that keeps it together.');
    await page.getByRole('button', { name: 'money', exact: true }).first().click();       // hero preview tabs work
    await expect(page.getByText(formatCents(m.outstandingCents)).first()).toBeVisible();
    await page.getByRole('button', { name: /NET45/ }).first().click();                   // NET45 timeline
    await expect(page.getByText('Then you wait.')).toBeVisible();
    await page.getByRole('button', { name: /Who owes me money/ }).click();   // Advisor sample answer
    await expect(page.locator('#advisor').getByText(new RegExp(`${formatCents(m.outstandingCents).replace('$', '\\$')} in total`))).toBeVisible();
    await expect(page.locator('#advisor').getByText('Sample answer · fictional creator records')).toBeVisible();
    for (const h of ['Organize.', 'Understand.', 'Grow.']) await expect(page.getByRole('heading', { name: h, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Built by a creator who needed it herself.' })).toBeVisible();
    await expect(page.locator('#beta').getByRole('heading', { name: 'How invitations work' })).toBeVisible();
    await expect(page.locator('#stories')).toHaveCount(0);                                         // no stories until a creator consents
    await expect(page.getByText('Founding-member pricing will be announced before paid access begins.').first()).toBeVisible();
    await expect(page.getByText('does not control when brands pay').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Read the full story/ })).toBeVisible();           // founder story excerpt
    await page.goto('/founder-files'); await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('The Founder Files.');   // public, no sign-in
    await page.getByRole('link', { name: /Marked Paid should mean/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Marked Paid should mean the money is recorded');
    for (const p of ['/pricing', '/privacy', '/terms']) { await page.goto(p); await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); }
    await expect(page.getByRole('link', { name: 'hello@netbyfriday.com' }).first()).toBeVisible();      // contact address on legal pages
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('The Story Behind NETBYFRIDAY');
    await expect(page.getByRole('img', { name: /Poca, founder/ })).toBeVisible();                     // founder portrait
    await expect(page.getByText(/processed by Friday/).first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'The business behind the content' })).toBeVisible();   // chapters
    await expect(page.locator('blockquote', { hasText: 'how much money I was owed' })).toBeVisible();
  });

  const email = `waitlist-${stamp}@e2e.test`;
  test('waitlist: join, then recognize a duplicate', async ({ page }) => {
    for (const expected of ['You’re on the list.', 'You’re already on the list.']) {
      await page.goto('/waitlist');
      await page.getByLabel('Email *').fill(email.toUpperCase());
      await page.getByLabel('Name').fill('Wren Waitlist');
      await page.getByRole('checkbox').check();
      await page.waitForTimeout(1700);                                              // forms submitted instantly are treated as bots
      await page.getByRole('button', { name: 'Request early access' }).click();
      await expect(page.getByRole('status')).toContainText(expected);
    }
  });

  test('admin invites a waitlist entry; the code works once for sign-up (local only)', async ({ page }) => {
    test.skip(!!process.env.E2E_BASE_URL, 'Needs direct database access to make an admin.');
    const admin = { email: `admin-${stamp}@e2e.test`, password: 'correct-horse-battery-admin' };
    await page.goto('/signup');
    await page.getByLabel('Invite code').fill('E2E-TEST-01'); await page.getByLabel('Email').fill(admin.email); await page.getByLabel('Password').fill(admin.password);
    await page.getByRole('button', { name: 'Create account' }).click(); await page.waitForURL('**/onboarding');
    execSync(`psql -h 127.0.0.1 -p 54322 -U postgres -qc "insert into public.admins (user_id) select id from auth.users where email = '${admin.email}'"`);
    await page.getByLabel('Your name').fill('Ada Admin'); await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Get organized financially' }).click(); await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Go to my dashboard' }).click(); await page.waitForURL('**/overview');
    await page.addInitScript(() => { (window as any).open = (u: string) => { (window as any).__opened = u; return null; }; });
    await page.goto('/admin');
    const row = page.locator('div', { hasText: email }).filter({ has: page.getByRole('button', { name: 'Invite' }) }).last();
    await row.getByRole('button', { name: 'Invite' }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__opened ?? '')).toContain('mailto:');   // invite email opens in the founder's email app
    const mailto = decodeURIComponent(await page.evaluate(() => (window as any).__opened));
    const code = mailto.match(/NBF-[0-9A-F]{8}/)![0];
    expect(mailto).toContain(email); expect(mailto).toContain('/signup');
    await page.getByRole('button', { name: 'invited' }).click();
    await expect(page.getByText(code).first()).toBeVisible();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Download CSV' }).click()]);
    expect(dl.suggestedFilename()).toMatch(/^netbyfriday-waitlist-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = fs.readFileSync((await dl.path())!, 'utf8');
    expect(csv).toContain('Requested on,Email,Name'); expect(csv).toMatch(new RegExp(`${email.replace(/[.]/g, '\\.')},.*,Invited,.*,${code}`));
    await page.getByRole('button', { name: 'Sign out' }).first().click(); await page.waitForURL('**/login');
    for (const [who, ok] of [[email, true], [`second-${stamp}@e2e.test`, false]] as const) {
      await page.goto('/signup');
      await page.getByLabel('Invite code').fill(code); await page.getByLabel('Email').fill(who); await page.getByLabel('Password').fill('correct-horse-battery-wren');
      await page.getByRole('button', { name: 'Create account' }).click();
      if (ok) { await page.waitForURL('**/onboarding');
        expect((await page.request.get('/api/admin/waitlist')).status()).toBe(404);   // signed in, but not an admin
        await page.context().clearCookies();
        expect((await page.request.get('/api/admin/waitlist')).status()).toBe(404); }   // signed out
      else await expect(page.getByRole('alert').filter({ hasText: 'invite code' })).toBeVisible();   // single use
    }
  });
});

// Headlines use tight leading; a highlight bar must start below the line above it, never paint over its letters.
test('highlight bars never cover the headline line above them', async ({ page }) => {
  for (const width of [1440, 390]) for (const path of ['/', '/pricing', '/waitlist']) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(path);
    const gap = await page.evaluate(() => {
      const hl = document.querySelector('h1 .nbf-hl') as HTMLElement | null;
      if (!hl) return null;
      const r = document.createRange(); r.selectNodeContents(hl.parentElement!.firstChild!);
      const top = hl.getBoundingClientRect().top;
      // lines of the headline that sit above the bar (when the bar shares a line with text, skip that line)
      const above = [...r.getClientRects()].filter(x => (x.top + x.bottom) / 2 < top);
      return above.length ? top - Math.max(...above.map(x => x.bottom)) : Infinity;
    });
    expect(gap, `${path} @${width}px: no highlight found`).not.toBeNull();
    expect(gap!, `${path} @${width}px`).toBeGreaterThanOrEqual(-0.5);
  }
});

test('home page shows the contract upload demo and the taxes & invoices section', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Contracts' }).first()).toBeVisible();
  const contracts = page.locator('#contracts');
  await contracts.scrollIntoViewIfNeeded();
  await expect(contracts.getByRole('heading', { name: /Upload the contract/ })).toBeVisible();
  await expect(contracts.getByRole('list', { name: 'Terms found in the contract' })).toBeVisible({ timeout: 10_000 });   // the demo plays when seen
  await expect(contracts.getByText('Confirm contract')).toBeVisible({ timeout: 10_000 });
  const taxes = page.locator('#taxes');
  await taxes.scrollIntoViewIfNeeded();
  await expect(taxes.getByText(/Set aside so far, at \d+% of profit/)).toBeVisible();
  await expect(taxes.getByText('What the brand sees')).toBeVisible();
  await expect(page.getByText('Sample data').first()).toBeVisible();
});
