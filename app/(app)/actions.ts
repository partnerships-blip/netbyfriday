'use server';
// All mutations. Each one: authenticate → refuse in demo mode → validate with zod → write under RLS → revalidate.
// workspace_id is always taken from the server session, never from the client.
import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { createHash, randomUUID } from 'node:crypto';
import { agreementsAllowed } from '@/lib/agreements/access';
import { renderAgreement, agreementText, agreementTitle, missingRequired } from '@/lib/agreements/template';
import { requireWritable, requireWorkspace, friendlyError, todayIn, UserError } from '@/lib/auth';
import * as S from '@/lib/validation';
import { track } from '@/lib/analytics';
import { ensureBrand } from '@/lib/data/brands';
import type { ActionResult } from '@/lib/types';
import { flag } from '@/lib/flags';
import { addDays, shortDate, dealOutstanding, formatCents } from '@/lib/finance/core.js';

type Ctx = Awaited<ReturnType<typeof requireWritable>>;
async function run(fn: (c: Ctx) => Promise<string | void>, message?: string): Promise<ActionResult> {
  try {
    const c = await requireWritable();
    const id = await fn(c);
    revalidatePath('/', 'layout');
    return { ok: true, id: id || undefined, message };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}
const ok = <T>(r: { data: T; error: any }): NonNullable<T> => { if (r.error) throw r.error; return r.data as NonNullable<T>; };

function dealRow(v: Partial<ReturnType<typeof S.DealSchema.parse>>) {
  const r: Record<string, unknown> = {};
  const map: Record<string, string> = { agency: 'agency', contactName: 'contact_name', contactEmail: 'contact_email', campaign: 'campaign', description: 'description', feeIsEstimate: 'fee_is_estimate', stage: 'stage', platforms: 'platforms', contentCategory: 'content_category', contractStatus: 'contract_status', usageRights: 'usage_rights', exclusivity: 'exclusivity', paymentTerms: 'payment_terms', notes: 'notes', startedOn: 'started_on', lastContactOn: 'last_contact_on', dealType: 'deal_type', commissionTerms: 'commission_terms', paymentSchedule: 'payment_schedule', paymentTrigger: 'payment_trigger', scheduleNote: 'schedule_note' };
  for (const [k, col] of Object.entries(map)) if ((v as any)[k] !== undefined) r[col] = (v as any)[k];
  if (v.fee !== undefined) r.fee_cents = v.fee;
  if ((v as any).giftedValue !== undefined) r.gifted_value_cents = (v as any).giftedValue;
  if ((v as any).contactId !== undefined) r.contact_id = (v as any).contactId || null;
  return r;
}

function delRow(v: { platform?: string; submitBy?: string | null; submittedOn?: string | null; publishedOn?: string | null; revisions?: number; contentUrl?: string }) {
  const r: Record<string, unknown> = {};
  if (v.platform !== undefined) r.platform = v.platform; if (v.submitBy !== undefined) r.submit_by = v.submitBy; if (v.submittedOn !== undefined) r.submitted_on = v.submittedOn;
  if (v.publishedOn !== undefined) r.published_on = v.publishedOn; if (v.revisions !== undefined) r.revisions = v.revisions; if (v.contentUrl !== undefined) r.content_url = v.contentUrl;
  return r;
}

// ---------- partnerships ----------
export async function createDeal(raw: unknown) {
  return run(async c => {
    const v = S.DealSchema.parse(raw);
    const brand_id = await ensureBrand(c, v.brand);
    const today = todayIn(c.ws.timezone);
    const row = ok(await c.sb.from('deals').insert({ ...dealRow(v), workspace_id: c.ws.id, brand_id, started_on: v.startedOn ?? today, last_contact_on: v.lastContactOn ?? today, completed_on: ['completed', 'paid'].includes(v.stage) ? today : null }).select('id').single());
    await track(c, 'deal_created');
    if (v.stage === 'paid') await settleIfKnown(c, row.id, today);
    return row.id;
  }, 'Partnership added');
}
export async function updateDeal(raw: unknown) {
  return run(async c => {
    const v = S.DealPatchSchema.parse(raw);
    const patch = dealRow(v);
    if (v.brand) patch.brand_id = await ensureBrand(c, v.brand);
    const before = v.stage === 'paid' ? ok(await c.sb.from('deals').select('stage').eq('id', v.id).eq('workspace_id', c.ws.id).single()).stage : null;
    ok(await c.sb.from('deals').update(patch).eq('id', v.id).eq('workspace_id', c.ws.id).select('id').single());
    if (v.stage === 'paid' && before !== 'paid') await settleIfKnown(c, v.id, todayIn(c.ws.timezone));
  }, 'Partnership updated');
}
/** Saving a deal as Paid from a form records the money when the amount is known; otherwise the partnership asks for it. */
async function settleIfKnown(c: Ctx, dealId: string, today: string) {
  try { await settleDeal(c, dealId, today); } catch (e) { if (!(e instanceof UserError && e.message === 'NEEDS_AMOUNT')) throw e; }
}
/**
 * Records the money for a partnership the creator has marked Paid (their own action, through the normal ledger rules):
 * pays off each open invoice on the deal, and invoices + pays any agreed fee that was never invoiced.
 * When the records can't tell the amount (estimated or $0 fee), `amount` must come from the creator.
 * Returns the cents recorded.
 */
async function settleDeal(c: Ctx, dealId: string, receivedOn: string, amount?: number) {
  const deal = ok(await c.sb.from('deals').select('id,brand_id,campaign,fee_cents,fee_is_estimate,deal_type').eq('id', dealId).eq('workspace_id', c.ws.id).single());
  const { data: invs } = await c.sb.from('invoices').select('id,amount_cents,voided_at,stream').eq('workspace_id', c.ws.id).eq('deal_id', dealId);
  const live = (invs ?? []).filter(v => !v.voided_at);
  const { data: pays } = live.length ? await c.sb.from('payments').select('invoice_id,amount_cents').eq('workspace_id', c.ws.id).in('invoice_id', live.map(v => v.id)) : { data: [] as any[] };
  const paid = new Map<string, number>();
  for (const p of pays ?? []) paid.set(p.invoice_id, (paid.get(p.invoice_id) ?? 0) + Number(p.amount_cents));
  const out = dealOutstanding({ feeCents: Number(deal.fee_cents), feeIsEstimate: deal.fee_is_estimate, dealType: deal.deal_type }, live.map(v => ({ amountCents: Number(v.amount_cents), paidCents: paid.get(v.id) ?? 0 })));
  if (!out.known && amount === undefined) throw new UserError('NEEDS_AMOUNT');
  const note = 'Recorded when the partnership was marked Paid';
  let recorded = 0;
  // 1) Pay off open invoices (oldest first). With an explicit amount, stop when it runs out.
  let budget = amount ?? Infinity;
  for (const v of live) {
    const bal = Number(v.amount_cents) - (paid.get(v.id) ?? 0);
    const pay = Math.min(bal, budget);
    if (pay <= 0) continue;
    ok(await c.sb.from('payments').insert({ workspace_id: c.ws.id, invoice_id: v.id, amount_cents: pay, received_on: receivedOn, note }));
    recorded += pay; budget -= pay;
  }
  // 2) Whatever is left (the never-invoiced part of the fee, or the creator's stated amount) gets an invoice and a payment.
  const rest = amount !== undefined ? amount - recorded : out.uninvoicedCents;
  if (rest > 0) {
    const { data: brand } = await c.sb.from('brands').select('name').eq('id', deal.brand_id).eq('workspace_id', c.ws.id).single();
    const { data: nums } = await c.sb.from('invoices').select('number').eq('workspace_id', c.ws.id);
    const next = Math.max(1000, ...(nums ?? []).map(n => Number(String(n.number).replace(/\D/g, '')) || 0)) + 1;
    const inv = ok(await c.sb.from('invoices').insert({ workspace_id: c.ws.id, number: 'INV-' + next, deal_id: deal.id, client_name: brand?.name || 'Client',
      description: (deal.campaign || 'Brand partnership').slice(0, 2000), stream: 'brand', amount_cents: rest, issued_on: receivedOn, due_on: receivedOn, terms: 'Paid' }).select('id').single());
    ok(await c.sb.from('payments').insert({ workspace_id: c.ws.id, invoice_id: inv.id, amount_cents: rest, received_on: receivedOn, note }));
    recorded += rest;
  }
  if (recorded > 0) await track(c, 'payment_recorded');
  return recorded;
}
const paidMessage = (cents: number, on: string, today: string) =>
  cents > 0 ? `Marked Paid. ${formatCents(cents)} recorded as received ${on === today ? 'today' : shortDate(on)}.` : 'Marked Paid. Everything was already recorded.';

export async function moveDeal(raw: unknown): Promise<ActionResult> {
  try {
    const c = await requireWritable();
    const v = S.MoveDealSchema.parse(raw);
    const today = todayIn(c.ws.timezone);
    const cur = ok(await c.sb.from('deals').select('stage,completed_on').eq('id', v.id).eq('workspace_id', c.ws.id).single());
    let recorded = 0;
    if (v.stage === 'paid' && cur.stage !== 'paid') recorded = await settleDeal(c, v.id, v.receivedOn ?? today, v.amount);
    const patch: Record<string, unknown> = { stage: v.stage };
    if ((v.stage === 'completed' || v.stage === 'paid') && !cur.completed_on) patch.completed_on = today;
    ok(await c.sb.from('deals').update(patch).eq('id', v.id).eq('workspace_id', c.ws.id).select('id').single());
    revalidatePath('/', 'layout');
    return { ok: true, message: v.stage === 'paid' && cur.stage !== 'paid' ? paidMessage(recorded, v.receivedOn ?? today, today) : 'Stage updated' } as ActionResult;
  } catch (e) {
    if (e instanceof UserError && e.message === 'NEEDS_AMOUNT') return { ok: false, error: 'NEEDS_AMOUNT' } as ActionResult;
    return { ok: false, error: friendlyError(e) };
  }
}
/** For a deal already marked Paid whose money isn't recorded yet. */
export async function recordDealPayment(raw: unknown): Promise<ActionResult> {
  try {
    const c = await requireWritable();
    const v = S.SettleDealSchema.parse(raw);
    const today = todayIn(c.ws.timezone);
    const recorded = await settleDeal(c, v.id, v.receivedOn ?? today, v.amount);
    revalidatePath('/', 'layout');
    return { ok: true, message: paidMessage(recorded, v.receivedOn ?? today, today).replace('Marked Paid. ', '') } as ActionResult;
  } catch (e) {
    if (e instanceof UserError && e.message === 'NEEDS_AMOUNT') return { ok: false, error: 'NEEDS_AMOUNT' } as ActionResult;
    return { ok: false, error: friendlyError(e) };
  }
}
export async function deleteDeal(id: string) {
  return run(async c => {
    S.uuid.parse(id);
    const { count } = await c.sb.from('invoices').select('id', { count: 'exact', head: true }).eq('deal_id', id).eq('workspace_id', c.ws.id);
    if (count) throw new UserError('This partnership has invoices. Delete or unlink them first so payment history stays intact.');
    ok(await c.sb.from('deals').delete().eq('id', id).eq('workspace_id', c.ws.id));
  }, 'Partnership deleted');
}
export async function addDeliverable(raw: unknown) {
  return run(async c => { const v = S.DeliverableSchema.parse(raw); ok(await c.sb.from('deliverables').insert({ workspace_id: c.ws.id, deal_id: v.dealId, name: v.name, due_on: v.dueOn, status: v.status, notes: v.notes, ...delRow(v) })); await track(c, 'deliverable_created'); }, 'Deliverable added');
}
export async function updateDeliverable(raw: unknown) {
  return run(async c => {
    const v = S.DeliverablePatchSchema.parse(raw);
    const p: Record<string, unknown> = {};
    if (v.name !== undefined) p.name = v.name; if (v.dueOn !== undefined) p.due_on = v.dueOn; if (v.status !== undefined) p.status = v.status; if (v.notes !== undefined) p.notes = v.notes;
    Object.assign(p, delRow(v));
    ok(await c.sb.from('deliverables').update(p).eq('id', v.id).eq('workspace_id', c.ws.id).select('id').single());
  });
}
export async function deleteDeliverable(id: string) {
  return run(async c => { S.uuid.parse(id); ok(await c.sb.from('deliverables').delete().eq('id', id).eq('workspace_id', c.ws.id)); }, 'Deliverable removed');
}
export async function importCsvDeals(rows: unknown) {
  return run(async c => {
    const list = S.CsvDealRowSchema.array().max(500, 'Import up to 500 rows at a time.').parse(rows);
    for (const r of list) {
      const brand_id = await ensureBrand(c, r.brand);
      const d = r.date ?? todayIn(c.ws.timezone);
      ok(await c.sb.from('deals').insert({ workspace_id: c.ws.id, brand_id, campaign: r.campaign, fee_cents: r.fee, stage: r.stage, started_on: d, last_contact_on: d, completed_on: ['completed', 'paid'].includes(r.stage) ? d : null }));
    }
    await track(c, 'csv_imported');
  }, 'Partnerships imported');
}

// ---------- contacts ----------
function contactRow(v: Record<string, any>) {
  const r: Record<string, unknown> = {};
  const map: Record<string, string> = { name: 'name', email: 'email', role: 'role', phone: 'phone', notes: 'notes' };
  for (const [k, col] of Object.entries(map)) if (v[k] !== undefined) r[col] = v[k];
  if (v.lastContactedOn !== undefined) r.last_contacted_on = v.lastContactedOn || null;
  if (v.followUpOn !== undefined) r.follow_up_on = v.followUpOn || null;
  return r;
}
export async function createContact(raw: unknown) {
  return run(async c => {
    const v = S.ContactSchema.parse(raw);
    const brand_id = v.brand ? await ensureBrand(c, v.brand) : null;
    const row = ok(await c.sb.from('contacts').insert({ ...contactRow(v), workspace_id: c.ws.id, brand_id }).select('id').single());
    await track(c, 'contact_created');
    return row.id;
  }, 'Contact added');
}
export async function updateContact(raw: unknown) {
  return run(async c => {
    const v = S.ContactPatchSchema.parse(raw);
    const patch = contactRow(v);
    if (v.brand !== undefined) patch.brand_id = v.brand ? await ensureBrand(c, v.brand) : null;
    ok(await c.sb.from('contacts').update(patch).eq('id', v.id).eq('workspace_id', c.ws.id).select('id').single());
  }, 'Contact updated');
}
export async function deleteContact(id: string) {
  // Linked partnerships and tasks keep existing; their contact link is cleared by the database (on delete set null).
  return run(async c => { S.uuid.parse(id); ok(await c.sb.from('contacts').delete().eq('id', id).eq('workspace_id', c.ws.id)); }, 'Contact deleted');
}

// ---------- tasks ----------
function taskRow(v: Record<string, any>) {
  const r: Record<string, unknown> = {};
  if (v.title !== undefined) r.title = v.title; if (v.notes !== undefined) r.notes = v.notes; if (v.priority !== undefined) r.priority = v.priority;
  if (v.dueOn !== undefined) r.due_on = v.dueOn || null;
  for (const [k, col] of [['dealId', 'deal_id'], ['contactId', 'contact_id'], ['invoiceId', 'invoice_id']]) if (v[k] !== undefined) r[col] = v[k] || null;
  return r;
}
export async function createTask(raw: unknown) {
  return run(async c => {
    const v = S.TaskSchema.parse(raw);
    const row = ok(await c.sb.from('tasks').insert({ ...taskRow(v), workspace_id: c.ws.id }).select('id').single());
    await track(c, 'task_created');
    return row.id;
  }, 'Task added');
}
export async function updateTask(raw: unknown) {
  return run(async c => {
    const v = S.TaskPatchSchema.parse(raw);
    const patch = taskRow(v);
    if (v.status !== undefined) { patch.status = v.status; patch.completed_at = v.status === 'done' ? new Date().toISOString() : null; }
    ok(await c.sb.from('tasks').update(patch).eq('id', v.id).eq('workspace_id', c.ws.id).select('id').single());
  });
}
export async function deleteTask(id: string) {
  return run(async c => { S.uuid.parse(id); ok(await c.sb.from('tasks').delete().eq('id', id).eq('workspace_id', c.ws.id)); }, 'Task deleted');
}

// ---------- money ----------
export async function createInvoice(raw: unknown) {
  return run(async c => {
    const v = S.InvoiceSchema.parse(raw);
    const { data: nums } = await c.sb.from('invoices').select('number').eq('workspace_id', c.ws.id);
    const next = Math.max(1000, ...(nums ?? []).map(n => Number(String(n.number).replace(/\D/g, '')) || 0)) + 1;
    const row = ok(await c.sb.from('invoices').insert({ workspace_id: c.ws.id, number: 'INV-' + next, deal_id: v.dealId || null, client_name: v.clientName, description: v.description, stream: v.stream, amount_cents: v.amount, issued_on: v.issuedOn, due_on: v.dueOn, terms: v.terms }).select('id').single());
    await track(c, 'invoice_created');
    return row.id;
  }, 'Invoice created');
}
export async function voidInvoice(id: string) {
  return run(async c => { S.uuid.parse(id); ok(await c.sb.from('invoices').update({ voided_at: new Date().toISOString() }).eq('id', id).eq('workspace_id', c.ws.id).select('id').single()); }, 'Invoice voided');
}
export async function recordPayment(raw: unknown) {
  return run(async c => {
    const v = S.PaymentSchema.parse(raw);
    ok(await c.sb.from('payments').insert({ workspace_id: c.ws.id, invoice_id: v.invoiceId, amount_cents: v.amount, received_on: v.receivedOn, note: v.note }));
    await track(c, 'payment_recorded');
  }, 'Payment recorded');
}
export async function deletePayment(id: string) {
  return run(async c => { S.uuid.parse(id); ok(await c.sb.from('payments').delete().eq('id', id).eq('workspace_id', c.ws.id)); }, 'Payment removed');
}
export async function addIncome(raw: unknown) {
  return run(async c => { const v = S.IncomeSchema.parse(raw); ok(await c.sb.from('income_entries').insert({ workspace_id: c.ws.id, stream: v.stream, amount_cents: v.amount, received_on: v.receivedOn, counterparty: v.counterparty, description: v.description })); await track(c, 'income_recorded'); }, 'Income recorded');
}
export async function deleteIncome(id: string) {
  return run(async c => { S.uuid.parse(id); ok(await c.sb.from('income_entries').delete().eq('id', id).eq('workspace_id', c.ws.id)); }, 'Income entry removed');
}
export async function addExpense(raw: unknown) {
  return run(async c => { const v = S.ExpenseSchema.parse(raw); ok(await c.sb.from('expenses').insert({ workspace_id: c.ws.id, category: v.category, amount_cents: v.amount, spent_on: v.spentOn, note: v.note })); }, 'Expense added');
}
export async function deleteExpense(id: string) {
  return run(async c => { S.uuid.parse(id); ok(await c.sb.from('expenses').delete().eq('id', id).eq('workspace_id', c.ws.id)); }, 'Expense removed');
}
export async function saveGoals(raw: unknown) {
  return run(async c => { const v = S.GoalsSchema.parse(raw); ok(await c.sb.from('workspaces').update({ monthly_goal_cents: v.monthly, annual_goal_cents: v.annual }).eq('id', c.ws.id)); await track(c, 'goal_set'); }, 'Goals saved');
}

// ---------- opportunities & audience ----------
export async function createOpportunity(raw: unknown) {
  return run(async c => { const v = S.OpportunitySchema.parse(raw); ok(await c.sb.from('opportunities').insert({ workspace_id: c.ws.id, ...v })); await track(c, 'opportunity_added'); }, 'Opportunity added');
}
export async function setOpportunityStatus(raw: unknown) {
  return run(async c => { const v = S.OppStatusSchema.parse(raw); ok(await c.sb.from('opportunities').update({ status: v.status }).eq('id', v.id).eq('workspace_id', c.ws.id)); });
}
export async function restoreOpportunities() {
  return run(async c => { ok(await c.sb.from('opportunities').update({ status: 'new' }).eq('workspace_id', c.ws.id).eq('status', 'dismissed')); }, 'Restored');
}
export async function saveSnapshots(raw: unknown) {
  return run(async c => {
    const list = S.SnapshotSchema.array().max(12).parse(raw);
    for (const s of list) ok(await c.sb.from('audience_snapshots').upsert({ workspace_id: c.ws.id, platform: s.platform, followers: s.followers, engagement_rate: s.engagementRate === '' ? null : s.engagementRate, avg_views: s.avgViews === '' ? null : s.avgViews, captured_on: s.capturedOn }, { onConflict: 'workspace_id,platform,captured_on' }));
  }, 'Metrics saved');
}
export async function saveCategory(raw: unknown) {
  return run(async c => { const v = S.CategorySchema.parse(raw); ok(await c.sb.from('content_categories').upsert({ workspace_id: c.ws.id, name: v.name, avg_views: v.avgViews, posts: v.posts }, { onConflict: 'workspace_id,name' })); }, 'Category saved');
}

// ---------- profile, brand, prefs ----------
export async function saveProfile(raw: unknown) {
  return run(async c => {
    const v = S.ProfileSchema.parse(raw);
    const m: Record<string, string> = { displayName: 'display_name', businessName: 'business_name', niche: 'niche', location: 'location', platforms: 'platforms', followerRange: 'follower_range', revenueStreams: 'revenue_streams', hasManager: 'has_manager', businessStructure: 'business_structure', priority: 'priority' };
    const p = Object.fromEntries(Object.entries(v).map(([k, x]) => [m[k], x]));
    ok(await c.sb.from('creator_profiles').update(p).eq('workspace_id', c.ws.id));
  }, 'Profile saved');
}
export async function saveBrand(raw: unknown) {
  return run(async c => {
    const v = S.BrandSchema.parse(raw);
    const p: Record<string, unknown> = {};
    if (v.name) p.brand_name = v.name; if (v.accent) p.accent = v.accent; if (v.headlineFont) p.headline_font = v.headlineFont;
    ok(await c.sb.from('workspaces').update(p).eq('id', c.ws.id));
  });
}
export async function savePrefs(raw: unknown) {
  // Preferences can change even in demo mode: they are per-user, not business data.
  try {
    const { sb, user } = await requireWorkspace();
    const v = S.PrefsSchema.parse(raw);
    const p: Record<string, unknown> = {};
    if (v.dailyBriefing !== undefined) p.daily_briefing = v.dailyBriefing; if (v.emailDigest !== undefined) p.email_digest = v.emailDigest;
    if (v.pushAlerts !== undefined) p.push_alerts = v.pushAlerts; if (v.analyticsOptIn !== undefined) p.analytics_opt_in = v.analyticsOptIn;
    ok(await sb.from('user_settings').update(p).eq('user_id', user.id));
    revalidatePath('/', 'layout');
    return { ok: true } as ActionResult;
  } catch (e) { return { ok: false, error: friendlyError(e) } as ActionResult; }
}

// ---------- onboarding ----------
export async function saveOnboardingStep(step: number, raw: unknown) {
  return run(async c => {
    const v = S.ProfileSchema.parse(raw ?? {});
    const m: Record<string, string> = { displayName: 'display_name', businessName: 'business_name', niche: 'niche', location: 'location', platforms: 'platforms', followerRange: 'follower_range', revenueStreams: 'revenue_streams', hasManager: 'has_manager', businessStructure: 'business_structure', priority: 'priority' };
    const p: Record<string, unknown> = Object.fromEntries(Object.entries(v).map(([k, x]) => [m[k], x]));
    p.onboarding_step = Math.max(0, Math.min(10, Math.floor(step)));
    ok(await c.sb.from('creator_profiles').update(p).eq('workspace_id', c.ws.id));
    await track(c, 'onboarding_step');
  });
}
export async function completeOnboarding() {
  return run(async c => { ok(await c.sb.from('creator_profiles').update({ onboarding_completed_at: new Date().toISOString(), onboarding_step: 4 }).eq('workspace_id', c.ws.id)); await track(c, 'onboarding_completed'); });
}

// ---------- small state ----------
export async function markNotificationsRead(keys: string[]) {
  try {
    const { sb, ws, user } = await requireWorkspace();
    const list = keys.filter(k => typeof k === 'string' && k.length <= 120).slice(0, 100);
    if (list.length) ok(await sb.from('notification_reads').upsert(list.map(key => ({ workspace_id: ws.id, user_id: user.id, key })), { onConflict: 'workspace_id,user_id,key' }));
    revalidatePath('/', 'layout');
    return { ok: true } as ActionResult;
  } catch (e) { return { ok: false, error: friendlyError(e) } as ActionResult; }
}
export async function toggleChecklist(key: string, done: boolean) {
  return run(async c => {
    if (typeof key !== 'string' || key.length > 120) throw new UserError('Invalid item.');
    if (done) ok(await c.sb.from('checklist_state').upsert({ workspace_id: c.ws.id, key, done_on: todayIn(c.ws.timezone) }, { onConflict: 'workspace_id,key' }));
    else ok(await c.sb.from('checklist_state').delete().eq('workspace_id', c.ws.id).eq('key', key));
  });
}
export async function clearAdvisor() {
  try { const { sb, ws, user } = await requireWorkspace(); ok(await sb.from('advisor_messages').delete().eq('workspace_id', ws.id).eq('user_id', user.id)); revalidatePath('/advisor'); return { ok: true } as ActionResult; }
  catch (e) { return { ok: false, error: friendlyError(e) } as ActionResult; }
}
export async function setDemoMode(on: boolean) {
  await requireWorkspace();
  if (on) cookies().set('ci_demo', '1', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
  else cookies().delete('ci_demo');
  revalidatePath('/', 'layout');
  return { ok: true } as ActionResult;
}

// ---------- feedback ----------
export async function submitFeedback(raw: unknown) {
  try {
    const { sb, user } = await requireWorkspace();
    const v = S.FeedbackSchema.parse(raw);
    ok(await sb.from('feedback').insert({ user_id: user.id, kind: v.kind, message: v.message, page: v.page, contact_ok: v.contactOk, user_agent: '' }));
    return { ok: true, message: 'Thanks. Your note was sent to the beta team.' } as ActionResult;
  } catch (e) { return { ok: false, error: friendlyError(e) } as ActionResult; }
}

// ---------- contracts (flag: contracts) ----------
// The AI only proposes terms (saved on the contract in "review"). This is the creator's own save/confirm, through the same
// rules as every other action. Confirming can link a partnership, add deliverables and reminder tasks; it never touches
// invoices, payments or revenue.
export async function saveContract(raw: unknown) {
  return run(async c => {
    if (!flag('contracts')) throw new UserError('Contracts are not available yet.');
    const v = S.ContractSchema.parse(raw);
    const cur = ok(await c.sb.from('contracts').select('id,status,deal_id').eq('id', v.id).eq('workspace_id', c.ws.id).single());
    const today = todayIn(c.ws.timezone);
    const row: Record<string, unknown> = {
      title: v.title, brand_name: v.brandName, fee_cents: v.fee, payment_terms: v.paymentTerms, signed_on: v.signedOn,
      usage_rights: v.usageRights, usage_starts_on: v.usageStartsOn, usage_ends_on: v.usageEndsOn,
      exclusivity: v.exclusivity, exclusivity_starts_on: v.exclusivityStartsOn, exclusivity_ends_on: v.exclusivityEndsOn,
      whitelisting: v.whitelisting, revisions: v.revisions, kill_fee: v.killFee, other_terms: v.otherTerms
    };
    if (v.confirm && cur.status !== 'confirmed') {
      let dealId: string | null = cur.deal_id;
      const terms = { usage_rights: v.usageRights.slice(0, 500), exclusivity: v.exclusivity.slice(0, 500), payment_terms: v.paymentTerms, contract_status: 'Signed' };
      if (v.link.mode === 'new') {
        const brand_id = await ensureBrand(c, v.brandName);
        dealId = ok(await c.sb.from('deals').insert({ workspace_id: c.ws.id, brand_id, campaign: v.link.campaign || v.title, fee_cents: v.fee ?? 0, stage: 'contracted',
          started_on: v.signedOn ?? today, last_contact_on: today, ...terms }).select('id').single()).id;
      } else if (v.link.mode === 'existing') {
        const patch: Record<string, unknown> = { ...terms };
        if (v.link.updateFee && v.fee !== null) patch.fee_cents = v.fee;
        dealId = ok(await c.sb.from('deals').update(patch).eq('id', v.link.dealId).eq('workspace_id', c.ws.id).select('id').single()).id;
      }
      if (v.deliverables.length) {
        if (!dealId) throw new UserError('Link the contract to a partnership to add its deliverables.');
        ok(await c.sb.from('deliverables').insert(v.deliverables.map(d => ({ workspace_id: c.ws.id, deal_id: dealId, name: d.name, due_on: d.dueOn }))));
      }
      if (v.reminders) {
        const who = v.brandName || v.title;
        const tasks = ([['Usage rights end', v.usageEndsOn], ['Exclusivity ends', v.exclusivityEndsOn]] as const)
          .filter(([, end]) => end && end >= today)
          .map(([what, end]) => ({ workspace_id: c.ws.id, deal_id: dealId, title: `${what} ${shortDate(end!)}: ${who}`.slice(0, 200),
            notes: what === 'Usage rights end' ? 'Check whether the brand is still running your content, and offer a renewal if they want more time.' : 'You can pitch competing brands in this category after this date.',
            due_on: addDays(end!, -7) < today ? today : addDays(end!, -7), priority: 'normal' }));
        if (tasks.length) ok(await c.sb.from('tasks').insert(tasks));
      }
      Object.assign(row, { status: 'confirmed', confirmed_at: new Date().toISOString(), deal_id: dealId });
    }
    ok(await c.sb.from('contracts').update(row).eq('id', v.id).eq('workspace_id', c.ws.id).select('id').single());
    return v.id;
  }, 'Contract saved');
}
// Connect a contract to a partnership from either side. Linking a confirmed contract fills in only the terms the partnership
// doesn't have yet (contract status, usage, exclusivity, payment terms). It never overwrites them, and never touches the
// fee, invoices, payments or revenue.
export async function linkContract(raw: unknown) {
  const linking = !!(raw as { dealId?: unknown } | null)?.dealId;
  return run(async c => {
    if (!flag('contracts')) throw new UserError('Contracts are not available yet.');
    const v = S.ContractLinkSchema.parse(raw);
    const cur = ok(await c.sb.from('contracts').select('id,status,payment_terms,usage_rights,exclusivity').eq('id', v.contractId).eq('workspace_id', c.ws.id).single());
    if (v.dealId) {
      const deal = ok(await c.sb.from('deals').select('id,contract_status,usage_rights,exclusivity,payment_terms').eq('id', v.dealId).eq('workspace_id', c.ws.id).single());
      if (cur.status === 'confirmed') {
        const patch: Record<string, string> = {};
        if (!deal.contract_status) patch.contract_status = 'Signed';
        if (!deal.usage_rights && cur.usage_rights) patch.usage_rights = cur.usage_rights.slice(0, 500);
        if (!deal.exclusivity && cur.exclusivity) patch.exclusivity = cur.exclusivity.slice(0, 500);
        if (!deal.payment_terms && cur.payment_terms) patch.payment_terms = cur.payment_terms.slice(0, 200);
        if (Object.keys(patch).length) ok(await c.sb.from('deals').update(patch).eq('id', deal.id).eq('workspace_id', c.ws.id).select('id').single());
      }
    }
    ok(await c.sb.from('contracts').update({ deal_id: v.dealId }).eq('id', v.contractId).eq('workspace_id', c.ws.id).select('id').single());
    return v.contractId;
  }, linking ? 'Contract linked' : 'Contract unlinked');
}
export async function deleteContract(id: string) {
  return run(async c => {
    if (!flag('contracts')) throw new UserError('Contracts are not available yet.');
    const cur = ok(await c.sb.from('contracts').select('storage_path').eq('id', S.uuid.parse(id)).eq('workspace_id', c.ws.id).single());
    ok(await c.sb.from('contracts').delete().eq('id', id).eq('workspace_id', c.ws.id));
    if (cur.storage_path) await c.sb.storage.from('attachments').remove([cur.storage_path]);
  }, 'Contract deleted');
}

// ---------- generated agreements (flag: agreements; beta admins before that) ----------
// The creator edits a draft, then signs and sends it. Sending freezes the text (and its SHA-256), creates a private link,
// and records the creator's signature. The brand signs only through sign_agreement(). netbyfriday sends no email.
async function agreementCtx(c: Ctx) { if (!(await agreementsAllowed(c.sb, c.user.id))) throw new UserError('The contract generator is not available yet.'); }
const clientIp = () => (headers().get('x-forwarded-for') ?? '').split(',')[0].trim().slice(0, 64);
const nowIso = () => new Date().toISOString();

export async function saveAgreement(raw: unknown) {
  return run(async c => {
    await agreementCtx(c);
    const v = S.AgreementSaveSchema.parse(raw);
    const cur = ok(await c.sb.from('agreements').select('id,status').eq('id', v.id).eq('workspace_id', c.ws.id).single());
    if (cur.status !== 'draft') throw new UserError('This agreement was already sent, so its terms can’t change. Void it and generate a new one.');
    ok(await c.sb.from('agreements').update({ terms: v.terms, title: agreementTitle(v.terms).slice(0, 200), deal_id: v.dealId }).eq('id', v.id).eq('workspace_id', c.ws.id).select('id').single());
    return v.id;
  }, 'Draft saved');
}

export async function sendAgreement(raw: unknown) {
  return run(async c => {
    await agreementCtx(c);
    const v = S.AgreementSendSchema.parse(raw);
    const cur = ok(await c.sb.from('agreements').select('id,status,terms,audit').eq('id', v.id).eq('workspace_id', c.ws.id).single());
    if (cur.status !== 'draft') throw new UserError('This agreement was already sent.');
    const terms = S.AgreementTermsSchema.parse(cur.terms ?? {});
    const missing = missingRequired(terms);
    if (missing.length) throw new UserError(`Add these before sending: ${missing.join(', ')}.`);
    if (v.signature.toLowerCase() !== terms.creatorName.trim().toLowerCase()) throw new UserError(`Type your name exactly as it appears in the agreement (${terms.creatorName}) to sign.`);
    const body = agreementText(renderAgreement(terms));
    const at = nowIso(), ip = clientIp();
    ok(await c.sb.from('agreements').update({
      status: 'sent', body, body_sha256: createHash('sha256').update(body, 'utf8').digest('hex'), share_token: randomUUID(), sent_at: at,
      creator_name: terms.creatorName, creator_email: terms.creatorEmail, creator_signature: v.signature, creator_signed_at: at, creator_ip: ip,
      audit: [...(Array.isArray(cur.audit) ? cur.audit : []), { event: 'consented', at, by: terms.creatorName }, { event: 'creator_signed', at, by: terms.creatorName, ip }, { event: 'link_created', at }]
    }).eq('id', v.id).eq('workspace_id', c.ws.id).select('id').single());
    return v.id;
  }, 'Signed. Your private link is ready to send.');
}

export async function voidAgreement(id: string) {
  return run(async c => {
    await agreementCtx(c);
    const cur = ok(await c.sb.from('agreements').select('id,status,audit').eq('id', S.uuid.parse(id)).eq('workspace_id', c.ws.id).single());
    if (cur.status === 'signed') throw new UserError('A signed agreement can’t be voided here. Agree any change with the brand in a new agreement.');
    if (cur.status !== 'sent') throw new UserError('Only a sent agreement can be voided.');
    ok(await c.sb.from('agreements').update({ status: 'void', share_token: null, voided_at: nowIso(), audit: [...(cur.audit ?? []), { event: 'voided', at: nowIso() }] })
      .eq('id', id).eq('workspace_id', c.ws.id).select('id').single());
  }, 'Agreement voided. The link no longer works.');
}

export async function deleteAgreement(id: string) {
  return run(async c => {
    await agreementCtx(c);
    const cur = ok(await c.sb.from('agreements').select('status').eq('id', S.uuid.parse(id)).eq('workspace_id', c.ws.id).single());
    if (cur.status === 'sent' || cur.status === 'signed') throw new UserError(cur.status === 'signed' ? 'Signed agreements are kept as a record.' : 'Void the agreement first, then delete it.');
    ok(await c.sb.from('agreements').delete().eq('id', id).eq('workspace_id', c.ws.id));
  }, 'Agreement deleted');
}

export async function linkAgreement(raw: unknown) {
  return run(async c => {
    await agreementCtx(c);
    const v = S.ContractLinkSchema.parse(raw);
    ok(await c.sb.from('agreements').update({ deal_id: v.dealId }).eq('id', v.contractId).eq('workspace_id', c.ws.id).select('id').single());
    return v.contractId;
  }, 'Partnership updated');
}

// ---------- taxes (flag: taxes) ----------
export async function saveTaxSettings(raw: unknown) {
  return run(async c => {
    const v = S.TaxSettingsSchema.parse(raw);
    ok(await c.sb.from('workspaces').update({ tax_set_aside_pct: v.pct }).eq('id', c.ws.id).select('id').single());
  }, 'Set-aside updated');
}

// ---------- invoice links (flag: invoiceLinks) ----------
export async function saveInvoiceSettings(raw: unknown) {
  return run(async c => {
    const v = S.InvoiceSettingsSchema.parse(raw);
    ok(await c.sb.from('workspaces').update({ invoice_payment_details: v.paymentDetails, invoice_email: v.email }).eq('id', c.ws.id).select('id').single());
  }, 'Invoice details saved');
}
/** Creates (or reuses) the invoice's private link. Returns the token. */
export async function shareInvoice(raw: unknown) {
  return run(async c => {
    if (!flag('invoiceLinks')) throw new UserError('Invoice links are not available yet.');
    const v = S.ShareInvoiceSchema.parse(raw);
    const cur = ok(await c.sb.from('invoices').select('share_token,voided_at').eq('id', v.id).eq('workspace_id', c.ws.id).single());
    if (cur.voided_at) throw new UserError('A voided invoice cannot be sent.');
    const token = cur.share_token ?? crypto.randomUUID();
    ok(await c.sb.from('invoices').update({ share_token: token, bill_to_email: v.billToEmail }).eq('id', v.id).eq('workspace_id', c.ws.id).select('id').single());
    return token;
  });
}
export async function markInvoiceSent(id: string) {
  return run(async c => {
    ok(await c.sb.from('invoices').update({ sent_at: new Date().toISOString() }).eq('id', S.uuid.parse(id)).eq('workspace_id', c.ws.id).select('id').single());
  }, 'Marked as sent');
}
export async function stopSharingInvoice(id: string) {
  return run(async c => {
    ok(await c.sb.from('invoices').update({ share_token: null }).eq('id', S.uuid.parse(id)).eq('workspace_id', c.ws.id).select('id').single());
  }, 'Link turned off. The old link no longer works.');
}
