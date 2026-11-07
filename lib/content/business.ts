// Business impact of content, calculated from the creator's records (cash basis, integer cents).
// Contracted value (agreed fees) and money received (recorded payments and income) are always kept apart,
// estimates are never counted as contracted, and a link is the creator's record, not evidence the post caused anything.
import type { CoreInput } from '../types';

export type LinkRow = { id: string; contentId: string; dealId: string | null; incomeId: string | null; note: string };
export type LinkedDeal = { linkId: string; dealId: string; label: string; stage: string; feeCents: number; feeIsEstimate: boolean; receivedCents: number };
export type LinkedIncome = { linkId: string; incomeId: string; label: string; receivedOn: string; amountCents: number };
export type Impact = { deals: LinkedDeal[]; income: LinkedIncome[]; contractedCents: number; estimatedCents: number; receivedCents: number };

/** Payments recorded against each deal's invoices (voided invoices excluded). */
export function receivedByDeal(input: Pick<CoreInput, 'invoices' | 'payments'>): Map<string, number> {
  const dealOf = new Map(input.invoices.filter(i => !i.voidedAt && i.dealId).map(i => [i.id, i.dealId!]));
  const out = new Map<string, number>();
  for (const p of input.payments) { const d = dealOf.get(p.invoiceId); if (d) out.set(d, (out.get(d) ?? 0) + p.amountCents); }
  return out;
}

export function impactFor(contentId: string, links: LinkRow[], input: Pick<CoreInput, 'deals' | 'invoices' | 'payments' | 'income'>): Impact {
  const rec = receivedByDeal(input);
  const deals: LinkedDeal[] = [], income: LinkedIncome[] = [];
  for (const l of links.filter(x => x.contentId === contentId)) {
    if (l.dealId) { const d = input.deals.find(x => x.id === l.dealId); if (d) deals.push({ linkId: l.id, dealId: d.id, label: `${d.brandName}${d.campaign ? ' – ' + d.campaign : ''}`, stage: d.stage, feeCents: d.feeCents, feeIsEstimate: !!d.feeIsEstimate, receivedCents: rec.get(d.id) ?? 0 }); }
    if (l.incomeId) { const e = input.income.find(x => x.id === l.incomeId); if (e) income.push({ linkId: l.id, incomeId: e.id, label: e.counterparty || e.description || 'Income', receivedOn: e.receivedOn, amountCents: e.amountCents }); }
  }
  const live = deals.filter(d => d.stage !== 'lost');
  return {
    deals, income,
    contractedCents: live.filter(d => !d.feeIsEstimate).reduce((s, d) => s + d.feeCents, 0),
    estimatedCents: live.filter(d => d.feeIsEstimate).reduce((s, d) => s + d.feeCents, 0),
    receivedCents: deals.reduce((s, d) => s + d.receivedCents, 0) + income.reduce((s, e) => s + e.amountCents, 0)
  };
}

/** For each content category: how many linked partnerships and how much money received. Used for patterns, not causes. */
export function byCategory(items: { id: string; category: string }[], links: LinkRow[], input: Pick<CoreInput, 'deals' | 'invoices' | 'payments' | 'income'>) {
  const out = new Map<string, { category: string; posts: number; deals: Set<string>; receivedCents: number }>();
  for (const it of items) {
    const cat = it.category.trim() || 'Uncategorised';
    const row = out.get(cat.toLowerCase()) ?? { category: cat, posts: 0, deals: new Set<string>(), receivedCents: 0 };
    row.posts++;
    const imp = impactFor(it.id, links, input);
    imp.deals.forEach(d => { if (!row.deals.has(d.dealId)) { row.deals.add(d.dealId); row.receivedCents += d.receivedCents; } });
    row.receivedCents += imp.income.reduce((s, e) => s + e.amountCents, 0);
    out.set(cat.toLowerCase(), row);
  }
  return Array.from(out.values()).map(r => ({ category: r.category, posts: r.posts, deals: r.deals.size, receivedCents: r.receivedCents })).sort((a, b) => b.receivedCents - a.receivedCents || b.deals - a.deals);
}
