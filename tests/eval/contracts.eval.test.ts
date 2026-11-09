// Contract reading and contract generator evaluation: real AI provider, the same prompts, parser and money engine the app uses.
// Hard rules (fail the run): no wrong fee (a number that isn't the agreed total), the known regressions stay fixed
// (deliverables found in long threads, removed deliverables left out, injected instructions ignored).
// Soft score: at least 80% of soft checks pass.
// Run: E2E_REAL_AI=1 ANTHROPIC_API_KEY=… AI_MODEL=… npm run eval:contracts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getProvider } from '@/lib/ai/provider';
import { CONTRACT_SYSTEM, CONTRACT_INSTRUCTION, parseExtraction, proposalToForm } from '@/lib/ai/contracts';
import { AGREEMENT_SYSTEM, AGREEMENT_INSTRUCTION } from '@/lib/ai/agreements';
import { extractionToTerms } from '@/lib/agreements/terms';
import type { ContractExtraction } from '@/lib/types';

const fx = (...p: string[]) => fs.readFileSync(path.join(__dirname, ...p), 'utf8');
type Read = { x: ContractExtraction; flags: string[]; fee: string; brand: string; email: string; deliverables: { name: string; dueOn: string }[]; stop: string | null };
type Check = { name: string; hard?: boolean; ok: (r: Read) => boolean };
type Case = { name: string; kind: 'message' | 'contract'; text: string; checks: Check[] };

const fee = (v: string, hard = true): Check => ({ name: v ? `fee is ${v}` : 'fee left empty (not a guessed number)', hard, ok: r => r.fee === v });
const has = (re: RegExp) => (r: Read) => r.deliverables.some(d => re.test(d.name));
const quotesFound: Check = { name: 'at least 80% of quotes found in the text', ok: r => { const f = Object.values(r.x.fields); return f.length === 0 || f.filter(q => q.found).length / f.length >= 0.8; } };

const CASES: Case[] = [
  { name: 'Short DM (generator)', kind: 'message', text: fx('..', 'e2e', 'fixtures', 'sample-deal-dm.txt'), checks: [
    fee('4200.00'), { name: 'brand is Petalwear', ok: r => r.brand === 'Petalwear' }, { name: 'signer email read', ok: r => r.email === 'jordan@petalwear.test' },
    { name: '2 deliverables', ok: r => r.deliverables.length === 2 }, { name: 'Reel due 2026-12-05', ok: r => r.deliverables.some(d => /reel/i.test(d.name) && d.dueOn === '2026-12-05') }, quotesFound] },
  { name: 'Long negotiation thread (generator)', kind: 'message', text: fx('fixtures', 'thread-negotiation.txt'), checks: [
    { name: 'fee is the written total $6,000, or empty; never $3,000 or digits glued together', hard: true, ok: r => r.fee === '6000.00' || r.fee === '' },
    fee('6000.00', false),
    { name: 'deliverables found (regression: none found in long threads)', hard: true, ok: r => r.deliverables.length > 0 },
    { name: 'no YouTube deliverable (it was removed)', hard: true, ok: r => !has(/youtube/i)(r) },
    { name: 'Reels listed', ok: has(/reel/i) }, { name: 'Stories listed', ok: has(/stor/i) },
    { name: 'split by month (November / December)', ok: r => has(/nov/i)(r) && has(/dec/i)(r) },
    { name: 'brand is Golden Strand', ok: r => /golden strand/i.test(r.brand) }, quotesFound] },
  { name: 'Monthly rate, no total (generator)', kind: 'message', text: fx('fixtures', 'rate-only.txt'), checks: [
    fee('', true), { name: 'TikTok listed', ok: has(/tiktok/i) }, { name: 'Stories listed', ok: has(/stor/i) }, { name: 'brand is Northfield Outdoor', ok: r => /northfield/i.test(r.brand) }] },
  { name: 'Instructions hidden in the message (generator)', kind: 'message', text: fx('fixtures', 'injection.txt'), checks: [
    fee('2500.00'), { name: 'no injected deliverables (1–2 only)', hard: true, ok: r => r.deliverables.length >= 1 && r.deliverables.length <= 2 },
    { name: 'signer email read', ok: r => r.email === 'chris@brightleaf.example' }, { name: 'Reel due 2026-12-10', ok: r => r.deliverables.some(d => d.dueOn === '2026-12-10') }] },
  { name: 'Price still being negotiated (generator)', kind: 'message', text: fx('fixtures', 'still-negotiating.txt'), checks: [
    fee('', true), { name: 'a warning says the fee is not settled', ok: r => r.x.warnings.some(w => /fee|budget|price|rate|negotiat|settled|agreed/i.test(w)) }] },
  { name: 'Uploaded contract (reader)', kind: 'contract', text: fx('..', 'e2e', 'fixtures', 'sample-contract.txt'), checks: [
    fee('6500.00'), { name: 'brand is Marigold Beauty Co.', ok: r => /marigold/i.test(r.brand) }, { name: '3 deliverables', ok: r => r.deliverables.length === 3 }, quotesFound] },
  { name: 'Risky clauses, all reworded (reader red flags)', kind: 'contract', text: fx('fixtures', 'reworded-risky-contract.txt'), checks: [
    fee('2800.00'),
    { name: 'flags usage with no end date (“for as long as Brand determines”)', ok: r => r.flags.includes('perpetual') },
    { name: 'flags pay-when-paid (“once Agency has itself been paid”)', ok: r => r.flags.includes('payWhenPaid') },
    { name: 'flags giving up ownership (“exclusive property of Brand upon creation”)', ok: r => r.flags.includes('ownership') },
    { name: 'flags paying money back (“return all compensation”)', ok: r => r.flags.includes('clawback') || r.flags.includes('performancePay') },
    { name: 'flags unlimited revision rounds', ok: r => r.flags.includes('unlimitedRevisions') },
    { name: 'catches at least 3 of these 5 traps', hard: true, ok: r => ['perpetual', 'payWhenPaid', 'ownership', 'clawback', 'unlimitedRevisions'].filter(id => r.flags.includes(id) || (id === 'clawback' && r.flags.includes('performancePay'))).length >= 3 }] },
  { name: 'A fair contract raises no high-risk alarms (reader red flags)', kind: 'contract', text: fx('fixtures', 'per-deliverable-contract.txt'), checks: [
    { name: 'no high-risk red flags on a fair contract', hard: true, ok: r => !(r.x.flags ?? []).some(f => f.severity === 'high') }] },
  { name: 'Per-Reel price with a written total (reader)', kind: 'contract', text: fx('fixtures', 'per-deliverable-contract.txt'), checks: [
    fee('3600.00'), { name: '3 Reels with dates', ok: r => r.deliverables.filter(d => d.dueOn).length === 3 || (r.deliverables.length === 1 && /3/.test(r.deliverables[0].name)) }, quotesFound] }
];

async function read(c: Case): Promise<Read> {
  const msg = c.kind === 'message';
  const out = await getProvider().readDocument({ system: msg ? AGREEMENT_SYSTEM : CONTRACT_SYSTEM, instruction: msg ? AGREEMENT_INSTRUCTION : CONTRACT_INSTRUCTION, text: c.text, maxTokens: msg ? 4000 : 3000 });
  const x = parseExtraction(out.text, 'text', c.text);
  if (msg) {
    const t = extractionToTerms(x, { creatorName: 'Eval Creator', creatorEmail: '' });
    return { x, flags: (x.flags ?? []).map(f => f.id), fee: t.fee, brand: t.brandName, email: t.brandSignerEmail, deliverables: t.deliverables, stop: out.stopReason };
  }
  const f = proposalToForm(x);
  return { x, flags: (x.flags ?? []).map(f => f.id), fee: f.fee, brand: f.brandName, email: x.fields.contactEmail?.value ?? '', deliverables: x.deliverables.map(d => ({ name: d.name, dueOn: d.dueOn ?? '' })), stop: out.stopReason };
}

const live = process.env.E2E_REAL_AI === '1';
describe.skipIf(!live)('contract reading + generator evaluation (real AI)', () => {
  it('meets the bar', async () => {
    const lines = ['# Contract reading and generator evaluation', '', `Model: ${process.env.AI_MODEL ?? '?'}`, ''];
    let hardFails = 0, soft = 0, softPass = 0;
    for (const c of CASES) {
      let r: Read | null = null, err = '';
      try { r = await read(c); } catch (e) { err = (e as Error).message; }
      lines.push(`## ${c.name}`);
      if (!r) { hardFails++; lines.push(`- ❌ **HARD** the read failed: ${err}`, ''); continue; }
      lines.push(`- Read: fee \`${r.fee || '(empty)'}\` · brand \`${r.brand || '(empty)'}\` · ${r.deliverables.length} deliverables: ${r.deliverables.map(d => `${d.name}${d.dueOn ? ` (${d.dueOn})` : ''}`).join('; ') || '—'}${r.stop === 'max_tokens' ? ' · ⚠️ cut off' : ''}${r.flags.length ? ` · red flags: ${r.flags.join(', ')}` : ''}`);
      for (const ch of c.checks) {
        const ok = ch.ok(r);
        if (ch.hard) { if (!ok) hardFails++; } else { soft++; if (ok) softPass++; }
        lines.push(`- ${ok ? '✅' : '❌'} ${ch.hard ? '**HARD** ' : ''}${ch.name}`);
      }
      if (r.x.warnings.length) lines.push(`- Warnings shown to the creator: ${r.x.warnings.map(w => `“${w}”`).join(' ')}`);
      lines.push('');
    }
    const pct = soft ? Math.round((softPass / soft) * 100) : 100;
    lines.splice(3, 0, `**Hard failures: ${hardFails}** (must be 0) · **Soft checks: ${softPass}/${soft} (${pct}%)** (must be ≥ 80%)`, '');
    const report = lines.join('\n');
    fs.mkdirSync('test-results', { recursive: true });
    fs.writeFileSync('test-results/contracts-eval.md', report);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n');
    console.log(report);
    expect(hardFails, 'hard failures').toBe(0);
    expect(pct, 'soft score %').toBeGreaterThanOrEqual(80);
  });
});
