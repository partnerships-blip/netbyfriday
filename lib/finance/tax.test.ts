import { describe, it, expect } from 'vitest';
import { taxYear, taxYears, setAsideCents, nec1099ThresholdCents, contractWindows } from './core.js';
import type { CoreInput } from '../types';

const base = (o: Partial<CoreInput> = {}): CoreInput => ({
  today: '2026-11-02', deals: [], invoices: [], payments: [], income: [], expenses: [],
  goals: { monthlyCents: 0, annualCents: 0 }, opportunities: [], audience: [], categories: [], ...o
});
const inv = (id: string, client: string, amount: number) => ({ id, number: id, dealId: null, clientName: client, description: '', stream: 'brand' as const, amountCents: amount, issuedOn: '2026-01-01', dueOn: '2026-02-01', terms: 'Net 30', voidedAt: null });

describe('tax set-aside', () => {
  it('rounds to the cent and never sets aside on a loss', () => {
    expect(setAsideCents(100001, 25)).toBe(25000);   // 25,000.25 cents rounds to 25,000
    expect(setAsideCents(100003, 25)).toBe(25001);   // 25,000.75 rounds up
    expect(setAsideCents(-5000, 25)).toBe(0);
    expect(setAsideCents(0, 30)).toBe(0);
  });
  it('uses the $2,000 1099-NEC threshold from 2026 and $600 before', () => {
    expect(nec1099ThresholdCents(2025)).toBe(60000);
    expect(nec1099ThresholdCents(2026)).toBe(200000);
    expect(nec1099ThresholdCents(2027)).toBe(200000);
  });
});

describe('taxYear (cash basis)', () => {
  const input = base({
    invoices: [inv('A', 'Lumière Skin', 500000), inv('B', 'Small Co', 150000), inv('C', 'Unpaid Co', 900000)],
    payments: [
      { id: 'p1', invoiceId: 'A', amountCents: 300000, receivedOn: '2026-03-10', note: '' },   // Q1
      { id: 'p2', invoiceId: 'A', amountCents: 200000, receivedOn: '2026-07-01', note: '' },   // Q3
      { id: 'p3', invoiceId: 'B', amountCents: 150000, receivedOn: '2025-12-30', note: '' }    // last year
    ],
    income: [{ id: 'e1', stream: 'affiliate', amountCents: 40000, receivedOn: '2026-05-20', counterparty: 'ShopMy', description: '' }], // Q2 (Apr–May)
    expenses: [
      { id: 'x1', category: 'Equipment', amountCents: 120000, spentOn: '2026-02-01', note: '' },
      { id: 'x2', category: 'Travel', amountCents: 30000, spentOn: '2026-06-15', note: '' },
      { id: 'x3', category: 'Travel', amountCents: 10000, spentOn: '2026-12-01', note: '' }       // after today: not counted yet
    ]
  });
  const t = taxYear(input, 2026, 25);

  it('counts only money received in the year, never unpaid invoices', () => {
    expect(t.incomeCents).toBe(300000 + 200000 + 40000);
    expect(t.expenseCents).toBe(120000 + 30000);
    expect(t.profitCents).toBe(540000 - 150000);
    expect(t.setAsideCents).toBe(97500);
  });
  it('splits into IRS estimated-tax periods, not calendar quarters', () => {
    expect(t.quarters.map(q => q.incomeCents)).toEqual([300000, 40000, 200000, 0]);
    expect(t.quarters.map(q => q.expenseCents)).toEqual([120000, 0, 30000, 0]);
    expect(t.quarters[1]).toMatchObject({ from: '2026-04-01', to: '2026-05-31', dueOn: '2026-06-15', status: 'closed' });
    expect(t.quarters[3]).toMatchObject({ status: 'current', dueOn: '2027-01-15', daysUntilDue: 74 });
    expect(t.nextDue?.n).toBe(4);
  });
  it('totals each payer and flags those at or over the 1099-NEC threshold', () => {
    expect(t.payers).toEqual([
      { name: 'Lumière Skin', totalCents: 500000, over1099: true },
      { name: 'ShopMy', totalCents: 40000, over1099: false }
    ]);
  });
  it('groups expenses by category', () => {
    expect(t.expenseCategories).toEqual([{ category: 'Equipment', totalCents: 120000 }, { category: 'Travel', totalCents: 30000 }]);
  });
  it('uses the $600 threshold for 2025 and has no dates for unverified years', () => {
    const y25 = taxYear(input, 2025, 25);
    expect(y25.incomeCents).toBe(150000);
    expect(y25.payers[0]).toMatchObject({ name: 'Small Co', over1099: true });
    expect(taxYear(input, 2024, 25).hasDates).toBe(false);
  });
  it('lists years with records, newest first', () => {
    expect(taxYears(input)).toEqual([2026, 2025]);
  });
});

describe('contract windows', () => {
  const c = (o: any) => ({ id: 'k1', title: 'Glow Season', brandName: 'Lumière Skin', dealId: 'd1', usageRights: '', usageStartsOn: null, usageEndsOn: null, exclusivity: '', exclusivityStartsOn: null, exclusivityEndsOn: null, status: 'confirmed', ...o });
  it('marks usage ending soon, exclusivity ended, and ignores contracts still in review', () => {
    const w = contractWindows([
      c({ usageRights: 'Paid social, 60 days', usageStartsOn: '2026-10-01', usageEndsOn: '2026-11-30', exclusivity: 'Skincare', exclusivityStartsOn: '2026-09-01', exclusivityEndsOn: '2026-10-15' }),
      c({ id: 'k2', status: 'review', usageRights: 'x', usageEndsOn: '2026-11-05' })
    ], '2026-11-02');
    expect(w.map(x => [x.kind, x.state, x.daysLeft])).toEqual([['usage', 'ending', 28], ['exclusivity', 'ended', -18]]);
  });
  it('treats rights without an end date as open, and future windows as upcoming', () => {
    const w = contractWindows([c({ usageRights: 'In perpetuity' }), c({ id: 'k3', exclusivity: 'Hotels', exclusivityStartsOn: '2026-12-01', exclusivityEndsOn: '2027-01-30' })], '2026-11-02');
    expect(w.map(x => x.state)).toEqual(['upcoming', 'open']);
  });
});
