import { describe, it, expect } from 'vitest';
import { parseExtraction, proposalToForm } from './contracts';

const CONTRACT = `CREATOR AGREEMENT — Glow Season Launch
This agreement is between Lumière Skin, Inc. ("Brand") and the Creator, signed 2026-09-30.
Fee: The Brand will pay the Creator a total fee of $9,500.00.
Payment: 50% on signing; balance due Net 45 after the final post.
Usage: Brand may use the content in paid social on Instagram and TikTok for sixty (60) days from first posting.
Exclusivity: Creator will not promote competing skincare brands for 45 days from signing.
Deliverables: one (1) Instagram Reel due 2026-11-05; three Instagram Stories.`;

const reply = JSON.stringify({
  fields: {
    title: { value: 'Glow Season Launch', quote: 'CREATOR AGREEMENT — Glow Season Launch' },
    brandName: { value: 'Lumière Skin', quote: 'between Lumière Skin, Inc. ("Brand")' },
    fee: { value: '$9,500.00', quote: 'a total fee of $9,500.00' },
    paymentTerms: { value: '50% on signing, balance Net 45 after final post', quote: '50% on signing; balance due Net 45 after the final post' },
    signedOn: { value: '2026-09-30', quote: 'signed 2026-09-30' },
    usageRights: { value: 'Paid social on Instagram and TikTok, 60 days', quote: 'paid social on Instagram and TikTok for sixty (60) days from first posting' },
    usageDays: { value: 60, quote: 'sixty (60) days' },
    exclusivity: { value: 'No competing skincare brands', quote: 'will not promote competing skincare brands' },
    exclusivityDays: { value: '45', quote: '45 days from signing' },
    exclusivityStartsOn: { value: '2026-09-30', quote: 'signed 2026-09-30' },
    killFee: { value: 'Full fee', quote: 'Brand pays the full fee if it cancels' },   // not in the contract: must be flagged
    revisions: { value: 'two', quote: '' },
    signedOnBogus: { value: 'x', quote: 'x' }
  },
  deliverables: [{ name: 'Instagram Reel', dueOn: '2026-11-05', quote: 'one (1) Instagram Reel due 2026-11-05' }, { name: '3 Instagram Stories', dueOn: 'soon', quote: 'three Instagram Stories' }],
  warnings: []
});

describe('contract extraction', () => {
  const x = parseExtraction('Here you go:\n' + reply, 'text', CONTRACT);
  it('keeps known fields and confirms quotes against the contract text', () => {
    expect(x.fields.fee).toEqual({ value: '$9,500.00', quote: 'a total fee of $9,500.00', found: true });
    expect(x.fields.usageDays?.value).toBe('60');
    expect(x.fields.brandName?.found).toBe(true);
    expect((x.fields as any).signedOnBogus).toBeUndefined();
  });
  it('flags a value whose quote is not in the contract', () => {
    expect(x.fields.killFee?.found).toBe(false);
    expect(x.warnings.join(' ')).toMatch(/kill fee/);
  });
  it('drops unclear deliverable dates but keeps the deliverable', () => {
    expect(x.deliverables).toEqual([
      { name: 'Instagram Reel', dueOn: '2026-11-05', quote: 'one (1) Instagram Reel due 2026-11-05', found: true },
      { name: '3 Instagram Stories', dueOn: null, quote: 'three Instagram Stories', found: true }
    ]);
  });
  it('computes end dates from start + days with the engine, and the fee in cents with the parser', () => {
    const f = proposalToForm(x);
    expect(f.fee).toBe('9500.00');
    expect(f.exclusivityEndsOn).toBe('2026-11-14');   // 2026-09-30 + 45 days
    expect(f.usageEndsOn).toBe('');                   // no usage start date written: the creator fills it in
  });
  it('PDF sources cannot be checked, so quotes are left unverified', () => {
    const p = parseExtraction(reply, 'pdf');
    expect(p.fields.fee?.found).toBeUndefined();
  });
  it('falls back to a manual form on unreadable output', () => {
    const bad = parseExtraction('I cannot help with that.', 'text', CONTRACT);
    expect(bad.fields).toEqual({});
    expect(bad.warnings[0]).toMatch(/by hand/);
  });
});
