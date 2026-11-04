// @ts-check
/**
 * Deterministic financial and intelligence calculations. No AI, no I/O.
 *
 * Revenue recognition: CASH BASIS. Earned revenue = money received, from exactly two sources:
 *   1. payments recorded against invoices
 *   2. income entries (money received without an invoice: affiliate payouts, ticket sales, product sales)
 * A deal's fee and an invoice's amount are never revenue on their own. They only describe what is
 * expected. This is what prevents the same transaction from being counted twice.
 *
 * All amounts are integer cents. All dates are 'YYYY-MM-DD' in the workspace's calendar.
 *
 * @typedef {import('../types').CoreInput} CoreInput
 * @typedef {import('../types').Insight} Insight
 */

export const STREAMS = [['brand', 'Brand partnerships'], ['affiliate', 'Affiliate'], ['events', 'Events'], ['digital', 'Digital products'], ['appearances', 'Appearances'], ['other', 'Other']];
export const STAGES = [['lead', 'Lead'], ['pitching', 'Pitching'], ['negotiating', 'Negotiating'], ['contracted', 'Contracted'], ['in_progress', 'In Progress'], ['completed', 'Completed'], ['paid', 'Paid'], ['lost', 'Lost / Declined']];
export const PIPELINE_STAGES = ['lead', 'pitching', 'negotiating'];
export const ACTIVE_STAGES = ['contracted', 'in_progress'];
export const CONTRACTED_STAGES = [...ACTIVE_STAGES, 'completed', 'paid'];
const DONE_DELIVERABLES = ['approved', 'posted'];
const DAY_MS = 86400000;

/** @param {string} iso */
export const dayNumber = iso => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY_MS);
/** @param {string} a @param {string} b */
export const daysBetween = (a, b) => dayNumber(b) - dayNumber(a);
/** @param {string} iso @param {number} n */
export const addDays = (iso, n) => new Date((dayNumber(iso) + n) * DAY_MS).toISOString().slice(0, 10);
/** @param {string} iso */
export const monthKey = iso => iso.slice(0, 7);
/** @param {number[]} a */
export const sum = a => a.reduce((x, y) => x + y, 0);

/** Last n calendar months ending with today's month, oldest first, as 'YYYY-MM'. @param {string} today @param {number} [n] */
export function lastMonths(today, n = 12) {
  const y = +today.slice(0, 4), m = +today.slice(5, 7) - 1, out = [];
  for (let i = n - 1; i >= 0; i--) out.push(new Date(Date.UTC(y, m - i, 1)).toISOString().slice(0, 7));
  return out;
}
/** @param {string} key 'YYYY-MM' */
export const monthLabel = (key, style = 'short') => new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, 1)).toLocaleDateString('en-US', style === 'long' ? { month: 'long', year: 'numeric', timeZone: 'UTC' } : { month: 'short', timeZone: 'UTC' });
/** @param {string|null|undefined} iso */
export const shortDate = iso => iso ? new Date(dayNumber(iso) * DAY_MS).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '—';

/** Whole-dollar display. @param {number} cents */
export function formatCents(cents) {
  const neg = cents < 0, d = Math.round(Math.abs(cents) / 100);
  return (neg ? '−' : '') + '$' + d.toLocaleString('en-US');
}
/** Exact display with cents when not whole. @param {number} cents */
export function formatCentsExact(cents) {
  const neg = cents < 0, a = Math.abs(cents), d = Math.floor(a / 100), c = a % 100;
  return (neg ? '−' : '') + '$' + d.toLocaleString('en-US') + (c ? '.' + String(c).padStart(2, '0') : '');
}
/**
 * Parses user money input into cents. Returns null for anything that is not a non-negative amount
 * with at most two decimals. Never silently drops a minus sign.
 * @param {unknown} input
 */
export function parseMoneyToCents(input) {
  const t = String(input ?? '').trim().replace(/^\$/, '').replace(/,/g, '').replace(/\s/g, '');
  if (!/^\d{1,11}(\.\d{1,2})?$/.test(t)) return null;
  const [w, f = ''] = t.split('.');
  return Number(w) * 100 + Number((f + '00').slice(0, 2));
}

/**
 * Days of credit implied by an invoice's payment terms text: "Net 45" → 45, "Due on receipt" → 0. Unknown → null.
 * @param {string|null|undefined} terms
 */
export function termsDays(terms) {
  const t = String(terms ?? '').trim().toLowerCase();
  if (!t) return null;
  if (/receipt|immediate|upon/.test(t)) return 0;
  const m = t.match(/(?:net\s*|^)(\d{1,3})\b/);
  return m ? Number(m[1]) : null;
}

/**
 * The single revenue ledger. Every revenue figure in the product is derived from this list.
 * @param {CoreInput} input
 */
export function buildLedger(input) {
  const invoices = new Map(input.invoices.map(v => [v.id, v]));
  const deals = new Map(input.deals.map(d => [d.id, d]));
  /** @type {{type:string,id:string}[]} */ const issues = [];
  /** @type {{id:string,source:'payment'|'income',recordId:string,invoiceId:string|null,dealId:string|null,date:string,amountCents:number,stream:string,counterparty:string}[]} */
  const entries = [];
  const seen = new Set();
  for (const p of input.payments) {
    const v = invoices.get(p.invoiceId);
    if (!v) { issues.push({ type: 'orphan_payment', id: p.id }); continue; }
    if (!Number.isInteger(p.amountCents) || p.amountCents <= 0) { issues.push({ type: 'invalid_amount', id: p.id }); continue; }
    const key = 'payment:' + p.id;
    if (seen.has(key)) { issues.push({ type: 'duplicate', id: p.id }); continue; }
    seen.add(key);
    const d = v.dealId ? deals.get(v.dealId) : undefined;
    entries.push({ id: key, source: 'payment', recordId: p.id, invoiceId: v.id, dealId: v.dealId, date: p.receivedOn, amountCents: p.amountCents, stream: v.stream, counterparty: d ? d.brandName : v.clientName });
  }
  for (const e of input.income) {
    if (!Number.isInteger(e.amountCents) || e.amountCents <= 0) { issues.push({ type: 'invalid_amount', id: e.id }); continue; }
    const key = 'income:' + e.id;
    if (seen.has(key)) { issues.push({ type: 'duplicate', id: e.id }); continue; }
    seen.add(key);
    entries.push({ id: key, source: 'income', recordId: e.id, invoiceId: null, dealId: null, date: e.receivedOn, amountCents: e.amountCents, stream: e.stream, counterparty: e.counterparty || '' });
  }
  entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { entries, issues };
}

/** @param {CoreInput} input */
export function invoiceStates(input) {
  /** @type {Map<string, number>} */ const paid = new Map();
  /** @type {Map<string, {date:string, amountCents:number, id:string}[]>} */ const history = new Map();
  for (const p of input.payments) {
    if (!(p.amountCents > 0)) continue;
    paid.set(p.invoiceId, (paid.get(p.invoiceId) || 0) + p.amountCents);
    history.set(p.invoiceId, [...(history.get(p.invoiceId) || []), { id: p.id, date: p.receivedOn, amountCents: p.amountCents }]);
  }
  return input.invoices.filter(v => !v.voidedAt).map(v => {
    const paidCents = paid.get(v.id) || 0;
    const balanceCents = Math.max(0, v.amountCents - paidCents);
    const overpaidCents = Math.max(0, paidCents - v.amountCents);
    const daysLate = balanceCents > 0 && v.dueOn < input.today ? daysBetween(v.dueOn, input.today) : 0;
    const daysUntil = balanceCents > 0 && v.dueOn >= input.today ? daysBetween(input.today, v.dueOn) : null;
    const state = balanceCents === 0 ? 'paid' : daysLate > 0 ? 'overdue' : paidCents > 0 ? 'partial' : 'awaiting';
    return { ...v, paidCents, balanceCents, overpaidCents, daysLate, daysUntil, state, payments: history.get(v.id) || [] };
  });
}

/** @param {CoreInput} input */
export function compute(input) {
  const today = input.today;
  const months = lastMonths(today, 12);
  const monthSet = new Set(months);
  const { entries: ledger, issues } = buildLedger(input);
  const window12 = ledger.filter(e => monthSet.has(monthKey(e.date)) && e.date <= today);
  const streamKeys = STREAMS.map(s => s[0]);

  const revenueByMonth = months.map(k => {
    const rows = window12.filter(e => monthKey(e.date) === k);
    return { month: k, totalCents: sum(rows.map(e => e.amountCents)), byStream: Object.fromEntries(streamKeys.map(s => [s, sum(rows.filter(e => e.stream === s).map(e => e.amountCents))])) };
  });
  const thisMonthCents = revenueByMonth[11].totalCents;
  const prevMonthCents = revenueByMonth[10].totalCents;
  const year = today.slice(0, 4);
  const ytdCents = sum(ledger.filter(e => e.date.slice(0, 4) === year && e.date <= today).map(e => e.amountCents));
  const trailing12Cents = sum(window12.map(e => e.amountCents));
  const byStream = STREAMS.map(([key, label]) => ({ key, label, totalCents: sum(window12.filter(e => e.stream === key).map(e => e.amountCents)) }));
  /** @type {Map<string, number>} */ const cp = new Map();
  for (const e of window12) if (e.counterparty) cp.set(e.counterparty, (cp.get(e.counterparty) || 0) + e.amountCents);
  const byCounterparty = [...cp].map(([name, totalCents]) => ({ name, totalCents })).sort((a, b) => b.totalCents - a.totalCents);
  const monthsWithRevenue = revenueByMonth.filter(m => m.totalCents > 0).length;

  const invoices = invoiceStates(input);
  const open = invoices.filter(v => v.balanceCents > 0);
  const overdue = open.filter(v => v.daysLate > 0);
  const outstandingCents = sum(open.map(v => v.balanceCents));
  const overdueCents = sum(overdue.map(v => v.balanceCents));
  const upcomingCents = outstandingCents - overdueCents;
  const expectedNext30Cents = sum(open.filter(v => v.daysUntil !== null && v.daysUntil <= 30).map(v => v.balanceCents));

  const deals = input.deals;
  const pipeline = deals.filter(d => PIPELINE_STAGES.includes(d.stage));
  const pipelineCents = sum(pipeline.map(d => d.feeCents));
  const active = deals.filter(d => ACTIVE_STAGES.includes(d.stage));
  /** @type {Map<string, number>} */ const invoicedByDeal = new Map();
  for (const v of invoices) if (v.dealId) invoicedByDeal.set(v.dealId, (invoicedByDeal.get(v.dealId) || 0) + v.amountCents);
  const uninvoiced = deals.filter(d => CONTRACTED_STAGES.includes(d.stage)).map(d => ({ deal: d, cents: Math.max(0, d.feeCents - (invoicedByDeal.get(d.id) || 0)) })).filter(x => x.cents > 0);
  const uninvoicedCents = sum(uninvoiced.map(x => x.cents));
  /** @type {Map<string, number>} */ const receivedByDeal = new Map();
  for (const e of ledger) if (e.dealId) receivedByDeal.set(e.dealId, (receivedByDeal.get(e.dealId) || 0) + e.amountCents);

  const deliverables = active.flatMap(d => d.deliverables.map(x => ({ ...x, brandName: d.brandName, campaign: d.campaign })));
  const openDeliverables = deliverables.filter(x => !DONE_DELIVERABLES.includes(x.status));
  const weekDeliverables = openDeliverables.filter(x => { const n = daysBetween(today, x.dueOn); return n >= 0 && n <= 7; });
  const lateDeliverables = openDeliverables.filter(x => daysBetween(today, x.dueOn) < 0);
  const nextDeliverables = [...openDeliverables].filter(x => daysBetween(today, x.dueOn) >= -14).sort((a, b) => (a.dueOn < b.dueOn ? -1 : 1));

  // Tasks: creator-entered to-dos. Overdue = open with a due date before today.
  const tasks = input.tasks ?? [];
  const openTasks = tasks.filter(t => t.status === 'open');
  const overdueTasks = openTasks.filter(t => t.dueOn && t.dueOn < today);
  const dueTodayTasks = openTasks.filter(t => t.dueOn === today);
  const weekTasks = openTasks.filter(t => t.dueOn && t.dueOn >= today && daysBetween(today, t.dueOn) <= 7);
  const upcomingTasks = [...openTasks].sort((a, b) => (a.dueOn ?? '9999') < (b.dueOn ?? '9999') ? -1 : (a.dueOn ?? '9999') > (b.dueOn ?? '9999') ? 1 : 0);

  // Expected cash: unpaid balances of invoices that are not yet overdue, grouped into 8 weeks starting today.
  // Expected is not received: never added to revenue. Overdue balances are reported separately.
  const expectedWeeks = Array.from({ length: 8 }, (_, i) => {
    const start = addDays(today, i * 7), end = addDays(today, i * 7 + 6);
    const rows = open.filter(v => v.daysLate === 0 && v.dueOn >= start && v.dueOn <= end);
    return { start, end, cents: sum(rows.map(v => v.balanceCents)), invoiceIds: rows.map(v => v.id) };
  });
  const expected8wCents = sum(expectedWeeks.map(w => w.cents));
  const expectedLaterCents = sum(open.filter(v => v.daysLate === 0 && v.dueOn > addDays(today, 55)).map(v => v.balanceCents));

  // Payment terms: per terms label, open balance, overdue count, and average days from issue to final payment.
  /** @type {Map<string, {terms:string, days:number|null, openCount:number, openCents:number, overdueCount:number, overdueCents:number, paidDays:number[]}>} */ const tm = new Map();
  for (const v of invoices) {
    const label = (v.terms || '').trim() || 'No terms';
    const r = tm.get(label.toLowerCase()) || { terms: label, days: termsDays(label), openCount: 0, openCents: 0, overdueCount: 0, overdueCents: 0, paidDays: [] };
    if (v.balanceCents > 0) { r.openCount++; r.openCents += v.balanceCents; }
    if (v.daysLate > 0) { r.overdueCount++; r.overdueCents += v.balanceCents; }
    if (v.balanceCents === 0 && v.payments.length) r.paidDays.push(daysBetween(v.issuedOn, v.payments.map(p => p.date).sort().slice(-1)[0]));
    tm.set(label.toLowerCase(), r);
  }
  const termsStats = [...tm.values()].map(({ paidDays, ...r }) => ({ ...r, paidCount: paidDays.length, avgDaysToPay: paidDays.length ? Math.round(sum(paidDays) / paidDays.length) : null }))
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999));

  // This week: everything with a date in the next 7 days, plus anything already late. Deterministic; the Advisor only restates it.
  const in7 = addDays(today, 7);
  /** @type {{kind:string, ref:string, date:string|null, late:boolean, text:string, cents?:number}[]} */ const agenda = [
    ...openTasks.filter(t => t.dueOn && t.dueOn <= in7).map(t => ({ kind: 'task', ref: 'task:' + t.id, date: t.dueOn, late: !!t.dueOn && t.dueOn < today, text: t.title })),
    ...openDeliverables.filter(x => x.dueOn <= in7).map(x => ({ kind: 'deliverable', ref: 'deliverable:' + x.id, date: x.dueOn, late: x.dueOn < today, text: `${x.name} for ${x.brandName}` })),
    ...open.filter(v => v.dueOn <= in7).map(v => ({ kind: v.daysLate ? 'invoice_overdue' : 'invoice_due', ref: 'invoice:' + v.id, date: v.dueOn, late: v.daysLate > 0, text: `${v.number} from ${v.clientName}: ${formatCents(v.balanceCents)} ${v.daysLate ? `unpaid, ${v.daysLate} days overdue` : 'due'}`, cents: v.balanceCents }))
  ].sort((a, b) => (a.date ?? '') < (b.date ?? '') ? -1 : 1);

  // Follow-ups: who is waiting on the creator, or who the creator is waiting on. Each item names the record it comes from.
  const contacts = input.contacts ?? [];
  /** @type {{reason:string, ref:string, who:string, since:string|null, dealId?:string, invoiceId?:string, contactId?:string}[]} */ const followUps = [
    ...overdue.map(v => ({ reason: `Payment ${v.daysLate} days overdue on ${v.number} (${formatCents(v.balanceCents)})`, ref: 'invoice:' + v.id, who: v.clientName, since: v.dueOn, invoiceId: v.id })),
    ...deals.filter(d => d.stage === 'lead' && daysBetween(d.lastContactOn, today) >= 2).map(d => ({ reason: `Inquiry unanswered for ${daysBetween(d.lastContactOn, today)} days`, ref: 'deal:' + d.id, who: d.contactName || d.brandName, since: d.lastContactOn, dealId: d.id })),
    ...deals.filter(d => d.stage === 'pitching' && daysBetween(d.lastContactOn, today) >= 7).map(d => ({ reason: `No reply to your pitch for ${daysBetween(d.lastContactOn, today)} days`, ref: 'deal:' + d.id, who: d.contactName || d.brandName, since: d.lastContactOn, dealId: d.id })),
    ...deals.filter(d => d.stage === 'negotiating' && daysBetween(d.lastContactOn, today) >= 5).map(d => ({ reason: `Negotiation quiet for ${daysBetween(d.lastContactOn, today)} days`, ref: 'deal:' + d.id, who: d.contactName || d.brandName, since: d.lastContactOn, dealId: d.id })),
    ...contacts.filter(c => c.followUpOn && c.followUpOn <= in7).map(c => ({ reason: c.followUpOn && c.followUpOn < today ? `Follow-up date passed (${shortDate(c.followUpOn)})` : `Follow-up planned for ${shortDate(c.followUpOn)}`, ref: 'contact:' + c.id, who: `${c.name}${c.brandName ? ' at ' + c.brandName : ''}`, since: c.followUpOn, contactId: c.id }))
  ];

  const expenses12Cents = sum(input.expenses.filter(x => monthSet.has(monthKey(x.spentOn)) && x.spentOn <= today).map(x => x.amountCents));
  const profit12Cents = trailing12Cents - expenses12Cents;
  const g = input.goals;
  const monthPct = g.monthlyCents > 0 ? Math.min(100, Math.floor(thisMonthCents / g.monthlyCents * 100)) : 0;
  const yearPct = g.annualCents > 0 ? Math.min(100, Math.floor(ytdCents / g.annualCents * 100)) : 0;

  // Brand relationships: received money comes only from the ledger.
  /** @type {Map<string, {name:string, deals:any[], receivedCents:number, lastContactOn:string}>} */ const brands = new Map();
  for (const d of deals) {
    if (d.stage === 'lost') continue;
    const b = brands.get(d.brandName) || { name: d.brandName, deals: [], receivedCents: 0, lastContactOn: d.lastContactOn };
    b.deals.push(d);
    b.receivedCents += receivedByDeal.get(d.id) || 0;
    if (d.lastContactOn > b.lastContactOn) b.lastContactOn = d.lastContactOn;
    brands.set(d.brandName, b);
  }

  const ctx = { input, today, months, revenueByMonth, thisMonthCents, trailing12Cents, monthsWithRevenue, byStream, byCounterparty, open, overdue, weekDeliverables, lateDeliverables, deals, brands, invoicedByDeal, receivedByDeal, expectedNext30Cents, ledger, invoices };
  const insights = buildInsights(ctx);

  const notifications = [
    ...overdue.map(v => ({ key: 'overdue:' + v.id, type: 'Overdue invoice', text: `${v.number} from ${v.clientName} is ${v.daysLate} days overdue (${formatCents(v.balanceCents)})`, href: '/money' })),
    ...open.filter(v => v.daysUntil !== null && v.daysUntil <= 7).map(v => ({ key: 'due:' + v.id + ':' + v.dueOn, type: 'Payment due soon', text: `${v.clientName}: ${formatCents(v.balanceCents)} due ${shortDate(v.dueOn)}`, href: '/money' })),
    ...overdueTasks.map(t => ({ key: 'task-late:' + t.id + ':' + t.dueOn, type: 'Task overdue', text: `${t.title} (was due ${shortDate(t.dueOn)})`, href: '/tasks' })),
    ...dueTodayTasks.map(t => ({ key: 'task-today:' + t.id + ':' + t.dueOn, type: 'Task due today', text: t.title, href: '/tasks' })),
    ...weekDeliverables.map(x => ({ key: 'deliverable:' + x.id + ':' + x.dueOn, type: 'Campaign deadline', text: `${x.name} for ${x.brandName} due ${shortDate(x.dueOn)}`, href: '/partnerships?deal=' + x.dealId })),
    ...deals.filter(d => d.stage === 'lead' && daysBetween(d.lastContactOn, today) >= 2).map(d => ({ key: 'inquiry:' + d.id, type: 'Unanswered inquiry', text: `${d.brandName} reached out ${shortDate(d.startedOn)}`, href: '/partnerships?deal=' + d.id })),
    ...deals.filter(d => d.stage === 'pitching').map(d => ({ key: 'pitch:' + d.id, type: 'Pitch awaiting reply', text: `${d.brandName} hasn't replied to your pitch`, href: '/partnerships?deal=' + d.id })),
    ...(g.monthlyCents > 0 && monthPct >= 50 ? [{ key: 'goal:' + months[11] + ':' + Math.floor(monthPct / 25) * 25, type: 'Goal milestone', text: monthPct >= 100 ? `You reached your ${monthLabel(months[11])} goal` : `You've passed ${Math.floor(monthPct / 25) * 25}% of your ${monthLabel(months[11])} goal`, href: '/money' }] : [])
  ];

  const checklist = [
    ...[...overdueTasks, ...dueTodayTasks].slice(0, 2).map(t => ({ key: 'task:' + t.id, text: t.title, href: '/tasks' })),
    ...overdue.slice(0, 1).map(v => ({ key: 'remind:' + v.id, text: `Send a payment reminder to ${v.clientName} for ${v.number}`, href: '/money' })),
    ...[...lateDeliverables, ...weekDeliverables].slice(0, 2).map(x => ({ key: 'deliver:' + x.id, text: `${x.name} for ${x.brandName} (due ${shortDate(x.dueOn)})`, href: '/partnerships?deal=' + x.dealId })),
    ...deals.filter(d => d.stage === 'lead').slice(0, 1).map(d => ({ key: 'reply:' + d.id, text: `Reply to ${d.brandName}`, href: '/partnerships?deal=' + d.id })),
    ...insights.filter(i => i.id.startsWith('reconnect:')).slice(0, 1).map(i => ({ key: 'reconnect:' + i.id, text: i.title, href: '/partnerships' }))
  ];

  const reconnectCount = insights.filter(i => i.id.startsWith('reconnect:')).length;
  const dueWeek = open.filter(v => v.daysUntil !== null && v.daysUntil <= 7).length;
  const hasAnything = deals.length || ledger.length || input.invoices.length;
  const plural = (/** @type {number} */ n, /** @type {string} */ w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const briefing = hasAnything
    ? `You have ${plural(active.length, 'active campaign')}, ${plural(dueWeek, 'invoice')} due this week${overdue.length ? ` and ${overdue.length} overdue` : ''}, and ${plural(reconnectCount, 'previous brand relationship')} worth revisiting.`
    : 'Your workspace is empty. Add a partnership, an invoice, or income you have received, and your briefing will appear here.';

  return {
    today, months, revenueByMonth, thisMonthCents, prevMonthCents, ytdCents, trailing12Cents, byStream, byCounterparty, monthsWithRevenue,
    invoices, openInvoices: open, overdueInvoices: overdue, outstandingCents, overdueCents, upcomingCents, expectedNext30Cents,
    pipeline, pipelineCents, active, uninvoiced, uninvoicedCents, receivedByDeal: Object.fromEntries(receivedByDeal),
    openDeliverables, weekDeliverables, lateDeliverables, nextDeliverables,
    openTasks, overdueTasks, dueTodayTasks, weekTasks, upcomingTasks, agenda, followUps, expectedWeeks, expected8wCents, expectedLaterCents, termsStats,
    expenses12Cents, profit12Cents, goals: { ...g, monthPct, yearPct },
    brands: [...brands.values()], insights, notifications, checklist, briefing, issues, ledger
  };
}

/**
 * @typedef {{ today: string, deals: any[], open: any[], overdue: any[], weekDeliverables: any[], lateDeliverables: any[],
 *   brands: Map<string, any>, trailing12Cents: number, monthsWithRevenue: number, byStream: any[], byCounterparty: any[],
 *   input: any, thisMonthCents: number, months: string[], expectedNext30Cents: number, ledger: any[], invoices: any[],
 *   receivedByDeal: Map<string, number>, invoicedByDeal: Map<string, number> }} InsightCtx
 */
/** @param {InsightCtx} c @returns {Insight[]} */
function buildInsights(c) {
  const { today, deals, open, overdue, weekDeliverables, lateDeliverables, brands, trailing12Cents, monthsWithRevenue, byStream, byCounterparty, input, thisMonthCents, months, expectedNext30Cents, ledger, invoices } = c;
  /** @type {Insight[]} */ const out = [];
  /** @param {Omit<Insight,'score'>} o */
  const add = o => out.push({ ...o, score: o.scores.impact + o.scores.urgency + o.scores.confidence + o.scores.goal });
  const clamp = (/** @type {number} */ n, /** @type {number} */ hi) => Math.max(0, Math.min(hi, Math.round(n)));
  const ref = (/** @type {import('../types').RecordRef['type']} */ type, /** @type {string} */ id, /** @type {string} */ label) => ({ type, id, label });

  if (overdue.length) {
    const cents = sum(overdue.map(v => v.balanceCents));
    add({ id: 'overdue', category: 'Payment', title: `${formatCents(cents)} in overdue invoices`, evidence: 'verified',
      data: overdue.map(v => `${v.number} · ${v.clientName} · ${formatCents(v.balanceCents)} unpaid · ${v.daysLate} days past due`),
      explain: `${overdue.length === 1 ? 'One invoice is' : overdue.length + ' invoices are'} past the due date with an unpaid balance.`,
      action: 'Send a payment reminder for the oldest invoice.', actionLabel: 'Open invoices', target: '/money', draftKind: 'Following up on payment', invoiceId: [...overdue].sort((a, b) => b.daysLate - a.daysLate)[0].id,
      related: overdue.map(v => ref('invoice', v.id, v.number)), scores: { impact: clamp(cents / 15000, 40), urgency: 30, confidence: 20, goal: 6 } });
  }
  if (weekDeliverables.length || lateDeliverables.length) {
    const list = [...lateDeliverables, ...weekDeliverables];
    add({ id: 'deliverables', category: 'Partnership', title: lateDeliverables.length ? `${lateDeliverables.length} deliverable${lateDeliverables.length > 1 ? 's are' : ' is'} past due` : `${weekDeliverables.length} deliverable${weekDeliverables.length > 1 ? 's' : ''} due in the next 7 days`, evidence: 'verified',
      data: list.map(x => `${x.name} · ${x.brandName} · due ${shortDate(x.dueOn)}`), explain: 'Payment on these campaigns depends on delivering on time.',
      action: 'Review your shoot and posting plan.', actionLabel: 'Open partnerships', target: '/partnerships', related: list.map(x => ref('deliverable', x.id, x.name)),
      scores: { impact: 22, urgency: lateDeliverables.length ? 30 : 26, confidence: 20, goal: 5 } });
  }
  for (const d of deals.filter(d => d.stage === 'lead' && daysBetween(d.lastContactOn, today) >= 3)) {
    const n = daysBetween(d.lastContactOn, today);
    add({ id: 'inquiry:' + d.id, category: 'Partnership', title: `${d.brandName} inquiry unanswered for ${n} days`, evidence: 'verified',
      data: [`Received ${shortDate(d.startedOn)}`, `Last contact logged ${shortDate(d.lastContactOn)}`, d.feeCents ? `${formatCents(d.feeCents)} ${d.feeIsEstimate ? '(your estimate, not an offer)' : 'proposed'}` : 'No fee discussed yet'],
      explain: 'Inbound inquiries tend to go cold without a reply.', action: 'Reply with your rates and availability.', actionLabel: 'Open partnership', target: '/partnerships?deal=' + d.id,
      draftKind: 'Following up on an unanswered proposal', dealId: d.id, related: [ref('deal', d.id, d.brandName)], scores: { impact: clamp(d.feeCents / 25000, 20), urgency: 22, confidence: 14, goal: 8 } });
  }
  for (const d of deals.filter(d => d.stage === 'pitching' && daysBetween(d.lastContactOn, today) >= 7)) {
    add({ id: 'contract:' + d.id, category: 'Partnership', title: `No reply from ${d.brandName} for ${daysBetween(d.lastContactOn, today)} days`, evidence: 'verified',
      data: [`Pitch sent ${shortDate(d.lastContactOn)}`, `Proposed ${formatCents(d.feeCents)}`], explain: 'A short, specific follow-up a week after a pitch is normal.',
      action: 'Send a brief follow-up with one new idea.', actionLabel: 'Open partnership', target: '/partnerships?deal=' + d.id, draftKind: 'Following up on an unanswered proposal', dealId: d.id,
      related: [ref('deal', d.id, d.brandName)], scores: { impact: clamp(d.feeCents / 25000, 20), urgency: 18, confidence: 18, goal: 7 } });
  }
  // Deals marked Paid with no matching payment: the stage is a claim, the ledger is the record.
  for (const d of deals.filter(d => d.stage === 'paid')) {
    const received = c.receivedByDeal.get(d.id) || 0;
    const invoiced = c.invoicedByDeal.get(d.id) || 0;
    if (received >= Math.max(1, Math.min(d.feeCents, invoiced || d.feeCents))) continue;
    add({ id: 'unreconciled:' + d.id, category: 'Payment', title: `${d.brandName} is marked Paid, but ${received ? 'only part of the payment is' : 'no payment is'} recorded`, evidence: 'verified',
      data: [`Fee ${formatCents(d.feeCents)}`, `Invoiced ${formatCents(invoiced)}`, `Payments recorded ${formatCents(received)}`],
      explain: 'Revenue counts only recorded payments, so this deal is not in your totals yet.', action: invoiced ? 'Record the payment on its invoice.' : 'Create an invoice for this deal and record the payment.',
      actionLabel: 'Open money', target: '/money', related: [ref('deal', d.id, d.brandName)], scores: { impact: clamp(d.feeCents / 25000, 20), urgency: 12, confidence: 20, goal: 6 } });
  }
  for (const b of brands.values()) {
    const live = b.deals.some((/** @type {any} */ d) => !['paid', 'completed', 'lost'].includes(d.stage));
    const gap = daysBetween(b.lastContactOn, today);
    if (live || b.receivedCents <= 0 || gap < 90) continue;
    add({ id: 'reconnect:' + b.name, category: 'Partnership', title: `Reconnect with ${b.name}`, evidence: 'suggested',
      data: [`${b.deals.length} past collaboration${b.deals.length > 1 ? 's' : ''}`, `${formatCents(b.receivedCents)} received`, `Last contact ${shortDate(b.lastContactOn)} (${gap} days ago)`],
      explain: 'Past partners who paid are often quicker to close than new brands. Whether they have budget now is unknown.',
      action: 'Send a reconnect note with a seasonal idea.', actionLabel: 'Open partnerships', target: '/partnerships', draftKind: 'Reconnecting with a previous partner', dealId: b.deals[0].id,
      related: b.deals.map((/** @type {any} */ d) => ref('deal', d.id, d.campaign || d.brandName)), scores: { impact: clamp(b.receivedCents / 20000, 30), urgency: 8, confidence: 10, goal: 9 } });
  }
  // Average deal value: only deals with recorded payments, grouped by completion date.
  const paidDeals = deals.filter(d => d.completedOn && (c.receivedByDeal.get(d.id) || 0) > 0);
  const recent = paidDeals.filter(d => daysBetween(d.completedOn, today) <= 182);
  const prior = paidDeals.filter(d => { const k = daysBetween(d.completedOn, today); return k > 182 && k <= 365; });
  if (recent.length >= 2 && prior.length >= 2) {
    const avg = (/** @type {any[]} */ a) => sum(a.map(d => c.receivedByDeal.get(d.id) || 0)) / a.length;
    const a = avg(recent), b = avg(prior), ch = Math.round((a - b) / b * 100);
    add({ id: 'avg-deal', category: 'Revenue', title: `Average paid partnership ${ch >= 0 ? 'up' : 'down'} ${Math.abs(ch)}% over the last 6 months`, evidence: 'verified',
      data: [`Last 6 months: ${formatCents(a)} average across ${recent.length} deals`, `Prior 6 months: ${formatCents(b)} average across ${prior.length} deals`],
      explain: 'Uses money received per completed deal. With small samples, read this as a direction, not a trend.', action: 'Use the recent average as a floor when quoting new work.', actionLabel: 'Ask the Advisor', target: '/advisor',
      related: recent.map(d => ref('deal', d.id, d.brandName)), scores: { impact: 18, urgency: 6, confidence: recent.length + prior.length >= 6 ? 16 : 10, goal: 8 } });
  }
  if (trailing12Cents > 0 && monthsWithRevenue >= 3) {
    const top = [...byStream].sort((a, b) => b.totalCents - a.totalCents)[0];
    const share = Math.round(top.totalCents / trailing12Cents * 100);
    if (share >= 40) add({ id: 'stream-concentration', category: 'Risk', title: `${share}% of the last 12 months' revenue came from ${top.label.toLowerCase()}`, evidence: 'verified',
      data: byStream.filter(s => s.totalCents).map(s => `${s.label}: ${formatCents(s.totalCents)} (${Math.round(s.totalCents / trailing12Cents * 100)}%)`),
      explain: 'Relying heavily on one stream makes monthly income less predictable.', action: 'Look at which secondary stream could grow with the least extra work.', actionLabel: 'Ask the Advisor', target: '/advisor',
      related: [ref('metric', 'revenue_by_stream', 'Revenue by source')], scores: { impact: 20, urgency: 5, confidence: 18, goal: 10 } });
    if (byCounterparty.length >= 2) {
      const tb = byCounterparty[0], s2 = Math.round(tb.totalCents / trailing12Cents * 100);
      if (s2 >= 25) add({ id: 'client-concentration', category: 'Risk', title: `${tb.name} accounts for ${s2}% of your last 12 months' revenue`, evidence: 'verified',
        data: byCounterparty.slice(0, 4).map(x => `${x.name}: ${formatCents(x.totalCents)}`), explain: 'Losing one client would noticeably change your income.',
        action: 'Keep one or two new brand conversations active.', actionLabel: 'Open partnerships', target: '/partnerships', related: [ref('metric', 'revenue_by_counterparty', 'Revenue by client')],
        scores: { impact: 14, urgency: 4, confidence: 16, goal: 6 } });
    }
  }
  if (input.goals.monthlyCents > 0) {
    const remain = Math.max(0, input.goals.monthlyCents - thisMonthCents);
    const monthEnd = addDays(months[11] + '-01', 40).slice(0, 7) + '-01';
    const dueThisMonth = sum(open.filter(v => v.dueOn < monthEnd && v.daysLate === 0).map(v => v.balanceCents));
    add({ id: 'goal', category: 'Growth', title: remain ? `${formatCents(remain)} left to reach your ${monthLabel(months[11])} goal` : `${monthLabel(months[11])} goal reached`, evidence: remain ? 'estimate' : 'verified',
      data: [`Goal ${formatCents(input.goals.monthlyCents)}`, `Received so far ${formatCents(thisMonthCents)}`, `Invoices due before month end: ${formatCents(dueThisMonth)} (expected, not guaranteed)`],
      explain: 'Progress counts money received this month. Invoices due later are shown separately as expected cash.',
      action: remain ? 'Follow up on invoices due this month, or close one pipeline deal.' : 'Set next month’s goal.', actionLabel: 'Open money', target: '/money',
      related: [ref('metric', 'revenue_this_month', 'Revenue this month')], scores: { impact: 16, urgency: remain ? 14 : 2, confidence: 12, goal: 10 } });
  }
  if (input.categories.length >= 2) {
    const revByCat = new Map();
    for (const e of ledger) { const d = e.dealId && deals.find(x => x.id === e.dealId); if (d && d.contentCategory) revByCat.set(d.contentCategory, (revByCat.get(d.contentCategory) || 0) + e.amountCents); }
    const v = [...input.categories].sort((/** @type {any} */ a, /** @type {any} */ b) => b.avgViews - a.avgViews)[0];
    const r = [...revByCat].sort((a, b) => b[1] - a[1])[0];
    add({ id: 'audience-vs-revenue', category: 'Growth', title: r ? `${v.name} gets the most views; ${r[0]} earns the most` : `${v.name} gets the most views`, evidence: 'insufficient',
      data: [`${v.name}: ${v.avgViews.toLocaleString('en-US')} average views`, r ? `${r[0]}: ${formatCents(r[1])} received from tagged partnerships` : 'No partnerships tagged with a content category yet'],
      explain: 'This compares reach with revenue. There is no attribution data linking views to income.', action: 'Tag partnerships by content category to make the comparison more useful.', actionLabel: 'Open audience', target: '/audience',
      related: [], scores: { impact: 8, urgency: 2, confidence: 6, goal: 6 } });
  }
  if (!deals.length && !ledger.length && !invoices.length) {
    add({ id: 'empty', category: 'Getting started', title: 'Not enough data for insights yet', evidence: 'insufficient', data: ['0 partnerships', '0 payments or income entries', '0 invoices'],
      explain: 'Insights are calculated from your records only.', action: 'Add your most recent partnership.', actionLabel: 'Add partnership', target: '/partnerships',
      related: [], scores: { impact: 0, urgency: 10, confidence: 20, goal: 10 } });
  }
  return out.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
