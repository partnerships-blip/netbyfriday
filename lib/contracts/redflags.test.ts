import { describe, it, expect } from 'vitest';
import { scanText, scanTerms, mergeFlags, FLAG_INFO, TERM_HELP, type FlagId } from './redflags';
import { parseExtraction } from '../ai/contracts';

const ids = (t: string) => scanText(t).map(f => f.id);
const catches = (id: FlagId, ...phrases: string[]) => phrases.forEach(p => expect(ids(p), p).toContain(id));
const clean = (id: FlagId, ...phrases: string[]) => phrases.forEach(p => expect(ids(p), p).not.toContain(id));

describe('red flags: wording creators get burned by', () => {
  it('usage with no end date', () => {
    catches('perpetual', 'Brand may use the Content in perpetuity.', 'a perpetual, royalty-free license', 'in any and all media now known or hereafter devised',
      'for the full term of copyright', 'Brand may use the content forever.', 'without any time limitation', 'may be used indefinitely on all channels');
    clean('perpetual', 'Brand may repost the content for 90 days.', 'Usage: organic reposting for 60 days from posting.');
  });
  it('ownership, irrevocable rights and AI', () => {
    catches('ownership', 'All Deliverables are works made for hire.', 'Creator hereby assigns to Brand all right, title and interest in the Content.', 'Brand shall own all content created under this Agreement.');
    catches('irrevocable', 'Creator grants Brand an irrevocable license');
    catches('aiLikeness', 'Brand may use the Content to train artificial intelligence models.', 'Brand may create a digital replica of Creator.', 'synthetic voice of Creator');
    clean('ownership', 'Creator owns the content Creator makes under this Agreement.');
  });
  it('payment traps', () => {
    catches('payWhenPaid', 'Agency will pay Creator within 15 days after receipt of payment from the Client.', 'Payment is pay-when-paid.', 'Creator is paid only after the brand has paid Agency... only once the client pays');
    catches('longPayment', 'Payment terms: Net 90.', 'Net-60 from invoice', 'within 75 days after receipt of invoice');
    clean('longPayment', 'Net 30 after posting.', 'Net 45 from invoice', 'paid within 15 days of invoice');
    catches('performancePay', 'The fee is contingent on the Reel reaching a minimum of 100,000 views.', 'Compensation is based on sales generated through the link.');
    catches('paymentOnApproval', 'Brand will pay the fee 30 days after final approval of all deliverables.', 'Payment will be made at the end of the campaign.');
    catches('clawback', 'Creator shall refund the fee if the post is removed.', 'Brand may claw back any payment.', 'Creator agrees to liquidated damages of $5,000.');
  });
  it('control, exclusivity and ads', () => {
    catches('cancelAnyTime', 'Brand may terminate this Agreement at any time for any reason.');
    catches('indemnify', 'Creator shall indemnify and hold Brand harmless');
    catches('exclusivityBroad', 'Creator will not work with any competitor in the haircare category for 12 months (exclusivity).', 'Exclusivity: no competing brands in the beauty industry.');
    clean('exclusivityBroad', 'This partnership is non-exclusive; Creator may work with competitors.', 'Exclusivity: none.');
    catches('paidAds', 'Brand may whitelist the Content.', 'Creator will grant Spark Ads codes.', 'Brand may use the Content in paid advertising.');
    clean('paidAds', 'Paid ads are not included.', 'No paid usage.');
    catches('unlimitedRevisions', 'Creator will make unlimited revisions.', 'Creator will revise until Brand is fully satisfied.');
    catches('soleDiscretion', 'approved in Brand’s sole discretion');
    catches('autoRenew', 'This Agreement will automatically renew for successive 3-month terms.');
    catches('keepLive', 'Creator shall not delete or archive the posts.', 'The posts must remain live permanently.');
    clean('keepLive', 'Posts remain live for at least 6 months.');
    catches('editing', 'Brand may edit, cut and modify the Content.', 'Brand may create derivative works.');
    clean('editing', 'Creator will edit the video before sending it for review.');
  });
  it('quotes the actual sentence, and sorts high risk first', () => {
    const f = scanText('Fee is $2,000. Payment terms: Net 60. Brand may use the Content in perpetuity across all channels. Thanks!');
    expect(f[0]).toMatchObject({ id: 'perpetual', severity: 'high', quote: 'Brand may use the Content in perpetuity across all channels.', by: 'rule' });
    expect(f.find(x => x.id === 'longPayment')?.quote).toBe('Payment terms: Net 60.');
    expect(scanText('A normal deal: $1,500, 1 Reel, Net 30, organic reposting for 30 days, non-exclusive.')).toEqual([]);
  });
  it('every flag has an explanation, and terms have help text', () => {
    for (const info of Object.values(FLAG_INFO)) { expect(info.means.length).toBeGreaterThan(20); expect(info.burn.length).toBeGreaterThan(20); expect(info.ask.length).toBeGreaterThan(20); }
    for (const k of ['fee', 'paymentTerms', 'usageRights', 'whitelisting', 'exclusivity', 'revisions', 'killFee']) expect(TERM_HELP[k]).toBeTruthy();
  });
  it('rescans terms the creator typed or edited', () => {
    expect(scanTerms({ usageRights: 'Organic and paid use, worldwide, in perpetuity', killFee: '' }).map(f => f.id)).toEqual(['perpetual', 'worldwide', 'paidAds']);
  });
});

describe('red flags from the AI', () => {
  const text = 'Brand may use the Content for as long as Brand wishes. Creator will respond to comments for 30 days. Fee: $1,000.';
  it('keeps AI flags that point at real wording, uses our explanations, and drops made-up quotes', () => {
    const x = parseExtraction(JSON.stringify({ fields: {}, deliverables: [{ name: '1 Reel' }], flags: [
      { type: 'perpetual', quote: 'Brand may use the Content for as long as Brand wishes.' },
      { type: 'other', quote: 'Creator will respond to comments for 30 days.', why: 'Unpaid community management after the post.' },
      { type: 'clawback', quote: 'Creator must refund everything.' }                                    // not in the text
    ] }), 'text', text);
    expect(x.flags!.map(f => [f.id, f.by])).toEqual([['perpetual', 'ai'], ['other', 'ai']]);
    expect(x.flags![0].title).toBe(FLAG_INFO.perpetual.title);
    expect(x.flags![1]).toMatchObject({ severity: 'watch', aiNote: 'Unpaid community management after the post.' });
  });
  it('the fixed rules run on the text even when the AI flags nothing', () => {
    const x = parseExtraction(JSON.stringify({ fields: {}, deliverables: [{ name: '1 Reel' }] }), 'text', 'Usage in perpetuity. Payment Net 90.');
    expect(x.flags!.map(f => [f.id, f.by])).toEqual([['perpetual', 'rule'], ['longPayment', 'rule']]);
  });
  it('for a PDF (no text), the rules run on the quotes the AI returned', () => {
    const x = parseExtraction(JSON.stringify({ fields: { usageRights: { value: 'All media, perpetual', quote: 'Brand may use the Content in all media in perpetuity.' } }, deliverables: [] }), 'pdf');
    expect(x.flags!.map(f => f.id)).toContain('perpetual');
  });
  it('merging keeps one flag per kind, rule first', () => {
    const m = mergeFlags(scanText('Usage in perpetuity.'), [{ id: 'perpetual', severity: 'high', title: '', quote: 'x', by: 'ai' }]);
    expect(m).toHaveLength(1); expect(m[0].by).toBe('rule');
  });
});
