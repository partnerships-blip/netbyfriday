import { describe, it, expect } from 'vitest';
import { compute, buildLedger, invoiceStates, parseMoneyToCents, lastMonths, formatCents } from './core.js';
import type { CoreInput, Deal } from '../types';

const base = (o: Partial<CoreInput> = {}): CoreInput => ({
  today: '2026-10-22', deals: [], invoices: [], payments: [], income: [], expenses: [],
  goals: { monthlyCents: 0, annualCents: 0 }, opportunities: [], audience: [], categories: [], ...o
});
const deal = (o: Partial<Deal>): Deal => ({
  id: 'd1', brandId: 'b1', brandName: 'Brightmill', agency: '', contactName: '', contactEmail: '', campaign: 'Bake Week', description: '',
  feeCents: 320000, feeIsEstimate: false, stage: 'contracted', platforms: [], contentCategory: '', contractStatus: '', usageRights: '',
  exclusivity: '', paymentTerms: '', notes: '', startedOn: '2026-09-01', completedOn: null, lastContactOn: '2026-10-20', deliverables: [], ...o
});
const inv = (o: any) => ({ id: 'i1', number: 'INV-1', dealId: 'd1', clientName: 'Brightmill', description: '', stream: 'brand', amountCents: 320000, issuedOn: '2026-10-01', dueOn: '2026-10-31', terms: 'Net 30', voidedAt: null, ...o });

describe('money parsing', () => {
  it('parses dollars and cents exactly', () => {
    expect(parseMoneyToCents('1,234.5')).toBe(123450);
    expect(parseMoneyToCents('$10')).toBe(1000);
    expect(parseMoneyToCents('0.01')).toBe(1);
  });
  it('rejects negatives, junk and extra decimals', () => {
    expect(parseMoneyToCents('-50')).toBeNull();
    expect(parseMoneyToCents('abc')).toBeNull();
    expect(parseMoneyToCents('10.999')).toBeNull();
    expect(parseMoneyToCents('')).toBeNull();
  });
  it('formats whole dollars', () => { expect(formatCents(123450)).toBe('$1,235'); expect(formatCents(-500)).toBe('−$5'); });
});

describe('calendar months', () => {
  it('returns 12 months ending in the current month, across year boundaries', () => {
    const m = lastMonths('2026-02-10');
    expect(m).toHaveLength(12);
    expect(m[0]).toBe('2025-03');
    expect(m[11]).toBe('2026-02');
  });
  it('keeps revenue in the month it was received, regardless of today', () => {
    const input = base({ income: [{ id: 'e1', stream: 'affiliate', amountCents: 5000, receivedOn: '2026-03-15', counterparty: '', description: '' }] });
    const a = compute({ ...input, today: '2026-04-01' });
    const b = compute({ ...input, today: '2026-09-01' });
    expect(a.revenueByMonth.find(x => x.month === '2026-03')!.totalCents).toBe(5000);
    expect(b.revenueByMonth.find(x => x.month === '2026-03')!.totalCents).toBe(5000);
  });
});

describe('cash-basis revenue and de-duplication', () => {
  it('counts a deal + invoice + payment exactly once, as the payment', () => {
    const r = compute(base({ deals: [deal({ stage: 'completed', completedOn: '2026-10-05' })], invoices: [inv({})], payments: [{ id: 'p1', invoiceId: 'i1', amountCents: 320000, receivedOn: '2026-10-10', note: '' }] }));
    expect(r.thisMonthCents).toBe(320000);
    expect(r.trailing12Cents).toBe(320000);
    expect(r.byCounterparty).toEqual([{ name: 'Brightmill', totalCents: 320000 }]);
    expect(r.outstandingCents).toBe(0);
  });
  it('does not count deal fees or unpaid invoices as revenue', () => {
    const r = compute(base({ deals: [deal({})], invoices: [inv({})] }));
    expect(r.trailing12Cents).toBe(0);
    expect(r.outstandingCents).toBe(320000);
  });
  it('partial payment updates revenue and balance accurately', () => {
    const r = compute(base({ deals: [deal({})], invoices: [inv({})], payments: [{ id: 'p1', invoiceId: 'i1', amountCents: 120050, receivedOn: '2026-10-12', note: '' }] }));
    expect(r.thisMonthCents).toBe(120050);
    expect(r.outstandingCents).toBe(199950);
    expect(r.invoices[0].state).toBe('partial');
    expect(r.invoices[0].paidCents + r.invoices[0].balanceCents).toBe(320000);
  });
  it('adds payments and direct income independently', () => {
    const r = compute(base({ invoices: [inv({ dealId: null })], payments: [{ id: 'p1', invoiceId: 'i1', amountCents: 100000, receivedOn: '2026-10-02', note: '' }],
      income: [{ id: 'e1', stream: 'affiliate', amountCents: 25000, receivedOn: '2026-10-03', counterparty: 'Copperline', description: '' }] }));
    expect(r.thisMonthCents).toBe(125000);
    expect(r.byStream.find(s => s.key === 'brand')!.totalCents).toBe(100000);
    expect(r.byStream.find(s => s.key === 'affiliate')!.totalCents).toBe(25000);
  });
  it('drops duplicate and orphan payments and reports them', () => {
    const p = { id: 'p1', invoiceId: 'i1', amountCents: 1000, receivedOn: '2026-10-02', note: '' };
    const { entries, issues } = buildLedger(base({ invoices: [inv({})], payments: [p, p, { ...p, id: 'p2', invoiceId: 'missing' }] }));
    expect(entries).toHaveLength(1);
    expect(issues.map(i => i.type).sort()).toEqual(['duplicate', 'orphan_payment']);
  });
  it('ignores future-dated receipts in this month and trailing totals', () => {
    const r = compute(base({ income: [{ id: 'e1', stream: 'other', amountCents: 9999, receivedOn: '2026-10-30', counterparty: '', description: '' }] }));
    expect(r.thisMonthCents).toBe(0);
  });
  it('excludes voided invoices from outstanding', () => {
    const r = compute(base({ invoices: [inv({ voidedAt: '2026-10-05T00:00:00Z' })] }));
    expect(r.outstandingCents).toBe(0);
  });
});

describe('invoice status', () => {
  it('due today is not overdue; yesterday is', () => {
    const a = invoiceStates(base({ invoices: [inv({ dueOn: '2026-10-22' })] }))[0];
    const b = invoiceStates(base({ invoices: [inv({ dueOn: '2026-10-21' })] }))[0];
    expect(a.state).toBe('awaiting'); expect(a.daysUntil).toBe(0);
    expect(b.state).toBe('overdue'); expect(b.daysLate).toBe(1);
  });
  it('splits outstanding into overdue and upcoming', () => {
    const r = compute(base({ invoices: [inv({ id: 'a', number: 'A', dueOn: '2026-09-01', amountCents: 1000 }), inv({ id: 'b', number: 'B', dueOn: '2026-11-01', amountCents: 2500 })] }));
    expect(r.overdueCents).toBe(1000); expect(r.upcomingCents).toBe(2500); expect(r.outstandingCents).toBe(3500);
  });
});

describe('pipeline and contracted work', () => {
  it('pipeline counts only unconfirmed stages and is never revenue', () => {
    const r = compute(base({ deals: [deal({ id: 'x', stage: 'negotiating', feeCents: 800000 }), deal({ id: 'y', stage: 'contracted', feeCents: 450000 })] }));
    expect(r.pipelineCents).toBe(800000);
    expect(r.trailing12Cents).toBe(0);
    expect(r.uninvoicedCents).toBe(450000);
  });
  it('uninvoiced shrinks as invoices are created', () => {
    const r = compute(base({ deals: [deal({ feeCents: 650000 })], invoices: [inv({ amountCents: 325000 })] }));
    expect(r.uninvoicedCents).toBe(325000);
  });
});

describe('goals', () => {
  it('measures progress against money received', () => {
    const r = compute(base({ goals: { monthlyCents: 1000000, annualCents: 0 }, income: [{ id: 'e', stream: 'events', amountCents: 650000, receivedOn: '2026-10-08', counterparty: '', description: '' }] }));
    expect(r.goals.monthPct).toBe(65);
    const g = r.insights.find(i => i.id === 'goal')!;
    expect(g.title).toContain('$3,500');
    expect(g.evidence).toBe('estimate');
  });
});

describe('insights are only produced when data supports them', () => {
  it('empty workspace yields only the getting-started insight', () => {
    const r = compute(base());
    expect(r.insights.map(i => i.id)).toEqual(['empty']);
  });
  it('flags a deal marked Paid without a recorded payment', () => {
    const r = compute(base({ deals: [deal({ stage: 'paid', completedOn: '2026-09-01' })] }));
    expect(r.insights.some(i => i.id === 'unreconciled:d1')).toBe(true);
    expect(r.trailing12Cents).toBe(0);
  });
  it('does not produce concentration insights with under 3 months of revenue', () => {
    const r = compute(base({ income: [{ id: 'e', stream: 'brand', amountCents: 100000, receivedOn: '2026-10-01', counterparty: 'A', description: '' }] }));
    expect(r.insights.some(i => i.id === 'stream-concentration')).toBe(false);
  });
  it('scores are the sum of their components and sorted descending', () => {
    const r = compute(base({ deals: [deal({ stage: 'lead', lastContactOn: '2026-10-01' })], invoices: [inv({ dealId: null, dueOn: '2026-09-01' })] }));
    for (const i of r.insights) expect(i.score).toBe(i.scores.impact + i.scores.urgency + i.scores.confidence + i.scores.goal);
    expect(r.insights.map(i => i.score)).toEqual([...r.insights.map(i => i.score)].sort((a, b) => b - a));
  });
});
