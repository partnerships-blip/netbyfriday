'use server';
// All mutations. Each one: authenticate → refuse in demo mode → validate with zod → write under RLS → revalidate.
// workspace_id is always taken from the server session, never from the client.
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { requireWritable, requireWorkspace, friendlyError, todayIn, UserError } from '@/lib/auth';
import * as S from '@/lib/validation';
import { track } from '@/lib/analytics';
import { ensureBrand } from '@/lib/data/brands';
import type { ActionResult } from '@/lib/types';

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
  const map: Record<string, string> = { agency: 'agency', contactName: 'contact_name', contactEmail: 'contact_email', campaign: 'campaign', description: 'description', feeIsEstimate: 'fee_is_estimate', stage: 'stage', platforms: 'platforms', contentCategory: 'content_category', contractStatus: 'contract_status', usageRights: 'usage_rights', exclusivity: 'exclusivity', paymentTerms: 'payment_terms', notes: 'notes', startedOn: 'started_on', lastContactOn: 'last_contact_on' };
  for (const [k, col] of Object.entries(map)) if ((v as any)[k] !== undefined) r[col] = (v as any)[k];
  if (v.fee !== undefined) r.fee_cents = v.fee;
  if ((v as any).contactId !== undefined) r.contact_id = (v as any).contactId || null;
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
    return row.id;
  }, 'Partnership added');
}
export async function updateDeal(raw: unknown) {
  return run(async c => {
    const v = S.DealPatchSchema.parse(raw);
    const patch = dealRow(v);
    if (v.brand) patch.brand_id = await ensureBrand(c, v.brand);
    ok(await c.sb.from('deals').update(patch).eq('id', v.id).eq('workspace_id', c.ws.id).select('id').single());
  }, 'Partnership updated');
}
export async function moveDeal(raw: unknown) {
  return run(async c => {
    const v = S.MoveDealSchema.parse(raw);
    const today = todayIn(c.ws.timezone);
    const patch: Record<string, unknown> = { stage: v.stage };
    if (v.stage === 'completed' || v.stage === 'paid') {
      const cur = ok(await c.sb.from('deals').select('completed_on').eq('id', v.id).eq('workspace_id', c.ws.id).single());
      if (!cur.completed_on) patch.completed_on = today;
    }
    ok(await c.sb.from('deals').update(patch).eq('id', v.id).eq('workspace_id', c.ws.id).select('id').single());
  }, 'Stage updated');
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
  return run(async c => { const v = S.DeliverableSchema.parse(raw); ok(await c.sb.from('deliverables').insert({ workspace_id: c.ws.id, deal_id: v.dealId, name: v.name, due_on: v.dueOn, status: v.status, notes: v.notes })); await track(c, 'deliverable_created'); }, 'Deliverable added');
}
export async function updateDeliverable(raw: unknown) {
  return run(async c => {
    const v = S.DeliverablePatchSchema.parse(raw);
    const p: Record<string, unknown> = {};
    if (v.name !== undefined) p.name = v.name; if (v.dueOn !== undefined) p.due_on = v.dueOn; if (v.status !== undefined) p.status = v.status; if (v.notes !== undefined) p.notes = v.notes;
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
