// Finds text that another element is painted over (e.g. a highlight bar riding up over the line above).
// Usage: node scripts/overlap-check.mjs <baseUrl> <paths...>   env: WIDTHS=1440,390  EMAIL/PASSWORD to sign in first.
import { chromium } from 'playwright';
const [base, ...paths] = process.argv.slice(2);
const widths = (process.env.WIDTHS || '1440,390').split(',').map(Number);
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
if (process.env.EMAIL) {
  await page.goto(base + '/login');
  await page.getByLabel('Email').fill(process.env.EMAIL);
  await page.getByLabel('Password').fill(process.env.PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/overview');
  if (process.env.DEMO) await ctx.addCookies([{ name: 'ci_demo', value: '1', url: base }]);
}
let total = 0;
for (const w of widths) for (const p of paths) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(base + p, { waitUntil: 'networkidle' });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: w, height: Math.min(h, 16000) });
  await page.waitForTimeout(1200);
  const scan = mode => page.evaluate(mode => {
    const out = new Set();
    const pinned = el => { for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') return true; } return false; };
    const visible = el => { for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false; } return true; };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = walker.nextNode());) {
      if (!n.textContent.trim()) continue;
      const host = n.parentElement;
      if (!host || !visible(host) || host.closest('svg,script,style,[aria-hidden="true"]')) continue;
      const det = host.closest('details'); if (det && !det.open && !host.closest('summary')) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      for (const rect of r.getClientRects()) {
        if (rect.width < 6 || rect.height < 6) continue;
        for (const fy of [.12, .3, .5, .75, .9]) for (const fx of [.08, .3, .5, .7, .92]) {
          const x = rect.left + rect.width * fx, y = rect.top + rect.height * fy;
          if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
          // text scrolled outside its own scroll area is out of view, not covered
          let clipped = false;
          for (let e = host; e && e !== document.body; e = e.parentElement) {
            const st = getComputedStyle(e); if (st.overflowX === 'visible' && st.overflowY === 'visible') continue;
            const b = e.getBoundingClientRect(); if (x < b.left || x > b.right || y < b.top || y > b.bottom) { clipped = true; break; }
          }
          if (clipped) continue;
          const top = document.elementFromPoint(x, y);
          if (!top || top.contains(n)) continue;              // the text itself (or its ancestor) is on top
          // Only count it when the thing on top paints something: a background, border or image always;
          // its own text only if it lives outside this text's element (inline siblings may share leading).
          const s = getComputedStyle(top);
          const fill = s.backgroundColor !== 'rgba(0, 0, 0, 0)' || s.backgroundImage !== 'none' || parseFloat(s.borderTopWidth) > 0 || top.tagName === 'IMG';
          const paints = fill || (!host.contains(top) && top.textContent.trim());
          if (!paints) continue;
          // hit-testing can hand a point in the gap between lines to the nearest inline box; require real overlap
          // Fixed/sticky bars legitimately sit over content that scrolls under them; judge those only once
          // everything is scrolled to the end (mode 'end'), where nothing should still be stuck beneath them.
          if (mode === 'top' && pinned(top) && !pinned(host)) continue;
          if (mode === 'end' && !(pinned(top) && !pinned(host))) continue;
          if (![...top.getClientRects()].some(b => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom)) continue;
          const desc = el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
          out.add(`"${n.textContent.trim().slice(0, 40)}" (${desc(host)}) covered by ${desc(top)} "${top.textContent.trim().slice(0, 30)}" at y=${Math.round(y)} (line ${Math.round(rect.top)}–${Math.round(rect.bottom)}, cover top ${Math.round(top.getBoundingClientRect().top)})`);
        }
      }
    }
    return [...out];
  }, mode);
  const atTop = await scan('top');
  await page.evaluate(() => { for (const el of [document.scrollingElement, ...document.querySelectorAll('*')]) if (el.scrollHeight > el.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(el).overflowY) || el === document.scrollingElement) el.scrollTop = el.scrollHeight; });
  await page.waitForTimeout(300);
  // at the end, only text in the last screenful matters (earlier content is meant to have scrolled away)
  const atEnd = (await scan('end'));
  const hits = [...atTop, ...atEnd.map(x => '[scrolled to end] ' + x)];
  total += hits.length;
  console.log(`\n${p} @${w}px: ${hits.length ? hits.length + ' issue(s)' : 'clean'}`);
  hits.slice(0, 15).forEach(x => console.log('  - ' + x));
}
await browser.close();
console.log(`\nTOTAL ${total}`);
