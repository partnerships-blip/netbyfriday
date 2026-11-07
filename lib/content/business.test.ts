import { describe, it, expect } from 'vitest';
import { impactFor, byCategory } from './business';

const deal = (id: string, feeCents: number, o: any = {}) => ({ id, brandName: 'Brand ' + id, campaign: '', feeCents, feeIsEstimate: false, stage: 'contracted', ...o });
const input: any = {
  deals: [deal('d1', 300000), deal('d2', 280000), deal('d3', 290000), deal('d4', 250000), deal('est', 900000, { feeIsEstimate: true }), deal('lost', 500000, { stage: 'lost' })],
  invoices: [{ id: 'i1', dealId: 'd1', voidedAt: null }, { id: 'i2', dealId: 'd2', voidedAt: null }, { id: 'iv', dealId: 'd3', voidedAt: '2026-01-01' }],
  payments: [{ invoiceId: 'i1', amountCents: 300000 }, { invoiceId: 'i2', amountCents: 100000 }, { invoiceId: 'iv', amountCents: 999 }],
  income: [{ id: 'x1', amountCents: 45000, receivedOn: '2026-10-01', counterparty: 'ShopMy', description: '' }]
};
const L = (id: string, contentId: string, o: any) => ({ id, contentId, dealId: null, incomeId: null, note: '', ...o });

describe('business impact', () => {
  it('reproduces the brief example: 4 partnerships, $11,200 contracted, and keeps received money separate', () => {
    const links = ['d1', 'd2', 'd3', 'd4'].map((d, i) => L('l' + i, 'reel', { dealId: d }));
    const r = impactFor('reel', links, input);
    expect(r.deals).toHaveLength(4);
    expect(r.contractedCents).toBe(1120000);
    expect(r.receivedCents).toBe(400000);                      // only recorded payments; the voided invoice's payment doesn't count
  });
  it('never counts estimates as contracted, or lost deals at all, and adds linked income as received', () => {
    const r = impactFor('reel', [L('a', 'reel', { dealId: 'est' }), L('b', 'reel', { dealId: 'lost' }), L('c', 'reel', { incomeId: 'x1' })], input);
    expect(r).toMatchObject({ contractedCents: 0, estimatedCents: 900000, receivedCents: 45000 });
  });
  it('groups by category without double-counting a deal linked to two posts', () => {
    const items = [{ id: 'p1', category: 'Hair' }, { id: 'p2', category: 'hair' }, { id: 'p3', category: '' }];
    const rows = byCategory(items, [L('a', 'p1', { dealId: 'd1' }), L('b', 'p2', { dealId: 'd1' }), L('c', 'p2', { dealId: 'd2' })], input);
    expect(rows[0]).toEqual({ category: 'Hair', posts: 2, deals: 2, receivedCents: 400000 });
    expect(rows[1]).toEqual({ category: 'Uncategorised', posts: 1, deals: 0, receivedCents: 0 });
  });
});
