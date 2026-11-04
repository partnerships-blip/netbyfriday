import 'server-only';
// Everything the public site shows about "a creator's business" is calculated here, by the real engine, from the fictional
// Poca demo workspace. Nothing on the site is a hand-typed figure.
import { demoData } from '../demo/fixture';
import { compute, formatCents, monthLabel, shortDate, STAGES } from '../finance/core.js';
import { STAGE_LABEL } from '../brand';

export function siteSample() {
  const d = demoData(), i = d.input, m: any = compute(i);
  const $ = formatCents;
  const brandsAll = Array.from(new Set(i.deals.map(x => x.brandName)));
  const repeat = brandsAll.filter(b => i.deals.filter(x => x.brandName === b).length > 1).length;
  const lumiere = i.deals.find(x => x.id === 'demo-d1')!;
  const delta = m.prevMonthCents && m.revenueByMonth[9].totalCents ? Math.round((m.prevMonthCents - m.revenueByMonth[9].totalCents) / m.revenueByMonth[9].totalCents * 100) : 0;
  const first6 = m.revenueByMonth.slice(0, 6).reduce((a: number, x: any) => a + x.totalCents, 0), last6 = m.revenueByMonth.slice(5, 11).reduce((a: number, x: any) => a + x.totalCents, 0);
  const evidence = (e: string) => (e === 'verified' ? 'Verified' : e === 'estimate' ? 'Estimate' : e === 'suggested' ? 'Suggestion' : 'Insufficient data');
  const brightline = m.overdueInvoices[0];
  return {
    firstName: d.profile.displayName.split(' ')[0],
    stats: [
      { label: 'Received, 12 months', value: $(m.trailing12Cents), pill: 'Verified' },
      { label: 'Pending (NET)', value: $(m.outstandingCents), pill: `${m.openInvoices.length} invoices` },
      { label: 'Active deals', value: String(m.active.length + m.pipeline.length), pill: `${m.active.length} in production` },
      { label: monthLabel(m.months[10], 'long').split(' ')[0], value: $(m.prevMonthCents), pill: `${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta)}%` }
    ],
    pipeline: STAGES.filter(([k]) => k !== 'lost').map(([k, l]) => ({ label: l, n: i.deals.filter(x => x.stage === k).length })),
    payments: [...m.openInvoices].sort((a: any, b: any) => (a.dueOn < b.dueOn ? -1 : 1)).slice(0, 3).map((v: any) => ({ client: v.clientName, amount: $(v.balanceCents), terms: v.daysLate ? 'Overdue' : v.terms, late: v.daysLate > 0 })),
    deals: i.deals.filter(x => x.stage !== 'paid').slice(0, 6).map(x => ({ brand: x.brandName, campaign: x.campaign, fee: $(x.feeCents), stage: STAGE_LABEL[x.stage], key: x.stage })),
    outstanding: $(m.outstandingCents), overdue: $(m.overdueCents), openCount: m.openInvoices.length, overdueCount: m.overdueInvoices.length,
    terms: m.termsStats.map((t: any) => ({ terms: t.terms, open: t.openCount ? `${t.openCount} open · ${$(t.openCents)}` : 'Nothing open', avg: t.avgDaysToPay === null ? '—' : `~${t.avgDaysToPay}d to pay` })) as { terms: string; open: string; avg: string }[],
    insights: m.insights.slice(0, 4).map((x: any) => ({ title: x.title, evidence: evidence(x.evidence), action: x.actionLabel })) as { title: string; evidence: string; action: string }[],
    months: m.revenueByMonth.map((x: any) => ({ label: monthLabel(x.month), value: $(x.totalCents), cents: x.totalCents })) as { label: string; value: string; cents: number }[],
    total12: $(m.trailing12Cents), growth: first6 ? `${last6 >= first6 ? '+' : ''}${Math.round((last6 - first6) / first6 * 100)}% vs. the prior six months` : '',
    tiles: [
      { label: 'Repeat clients', value: `${repeat} of ${brandsAll.length}`, sub: 'Brands that booked more than once', pill: 'Verified' },
      { label: 'Payment status', value: $(m.outstandingCents), sub: `${m.overdueInvoices.length} overdue · ${m.openInvoices.length - m.overdueInvoices.length} not yet due`, pill: 'Verified' },
      { label: 'Pipeline', value: $(m.pipelineCents), sub: 'Unconfirmed deals. Never counted as revenue.', pill: 'Verified' },
      { label: 'Expected next 8 weeks', value: $(m.expected8wCents), sub: 'Open invoices by due date. Brands decide when they actually pay.', pill: 'Projection' }
    ],
    deliverables: lumiere.deliverables.slice(0, 3).map(x => ({ name: x.name, status: x.status })), campaign: lumiere.campaign,
    repeatPct: Math.round(repeat / brandsAll.length * 100) + '%',
    roles: { lateDays: brightline?.daysLate ?? 0, lateNumber: brightline?.number ?? 'INV-2041' },
    // The website's Advisor section shows pre-written sample answers built from the same records (no public AI endpoint).
    advisor: [
      { q: 'Who should I follow up with?', answer: `${m.followUps.length} follow-ups are waiting, starting with ${brightline ? `${brightline.clientName} on ${brightline.number}` : 'your oldest invoice'}.`,
        facts: m.followUps.slice(0, 3).map((f: any) => `${f.who}: ${f.reason}`), next: ['Send a friendly payment reminder (draft ready to edit)', 'Follow up on the unanswered pitch with one new idea'] },
      { q: 'How much revenue is still outstanding?', answer: `${$(m.outstandingCents)} across ${m.openInvoices.length} invoices, of which ${$(m.overdueCents)} is past due.`,
        facts: [...m.openInvoices].sort((a: any, b: any) => (a.dueOn < b.dueOn ? -1 : 1)).slice(0, 3).map((v: any) => `${v.number} · ${v.clientName} · ${$(v.balanceCents)} ${v.daysLate ? `${v.daysLate} days overdue` : `due ${shortDate(v.dueOn)}`}`),
        next: ['Confirm each billing contact a week before the due date', 'Send the overdue reminder first'] },
      { q: "What's on my plate this week?", answer: `${m.agenda.length} things have dates in the next 7 days or are already late.`,
        facts: m.agenda.slice(0, 4).map((a: any) => `${shortDate(a.date)} · ${a.text}`), next: ['Upload the Reel draft before Thursday', 'Add the Halcyon travel booking as a task'] },
      { q: 'Am I on track for my monthly goal?', answer: `Not yet: ${$(m.thisMonthCents)} received so far this month against a ${$(i.goals.monthlyCents)} goal.`,
        facts: [`Goal ${$(i.goals.monthlyCents)}`, `Received this month ${$(m.thisMonthCents)}`, `Invoices due before month end are expected, not received`], next: ['Close one pipeline deal or follow up on invoices due this month'] }
    ]
  };
}
