import { describe, it, expect } from 'vitest';
import { DealSchema, DealPatchSchema, DeliverablePatchSchema, DeliverableSchema } from './validation';

const id = '11111111-1111-4111-8111-111111111111';
describe('creator deal details', () => {
  it('defaults new partnerships to sponsored, one payment, payment clock not set', () => {
    expect(DealSchema.parse({ brand: 'Glow' })).toMatchObject({ dealType: 'sponsored', paymentSchedule: 'single', paymentTrigger: '', giftedValue: 0 });
  });
  it('parses gifted value as cents and rejects unknown types', () => {
    expect(DealSchema.parse({ brand: 'Glow', dealType: 'gifted', giftedValue: '1,250.50' }).giftedValue).toBe(125050);
    expect(() => DealSchema.parse({ brand: 'Glow', dealType: 'mlm' })).toThrow();
  });
  it('a partial edit does not reset fields it was not given', () => {
    const p = DealPatchSchema.parse({ id, notes: 'x' });
    expect(p.dealType).toBeUndefined(); expect(p.giftedValue).toBeUndefined(); expect(p.paymentTrigger).toBeUndefined();
  });
});
describe('deliverable details', () => {
  it('keeps absent dates absent, clears empty ones, and requires a real link', () => {
    const p = DeliverablePatchSchema.parse({ id, status: 'posted', publishedOn: '2026-11-03', submittedOn: '' });
    expect(p).toMatchObject({ publishedOn: '2026-11-03', submittedOn: null });
    expect(p.submitBy).toBeUndefined();
    expect(() => DeliverablePatchSchema.parse({ id, contentUrl: 'javascript:alert(1)' })).toThrow();
    expect(() => DeliverablePatchSchema.parse({ id, contentUrl: 'tiktok.com/@x' })).toThrow();
    expect(DeliverablePatchSchema.parse({ id, contentUrl: 'https://www.tiktok.com/@x/video/1' }).contentUrl).toBe('https://www.tiktok.com/@x/video/1');
    expect(DeliverableSchema.parse({ dealId: id, name: 'Reel', dueOn: '2026-12-01', revisions: '2' }).revisions).toBe(2);
  });
});
