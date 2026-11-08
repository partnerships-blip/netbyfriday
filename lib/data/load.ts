import 'server-only';
import { cache } from 'react';
import { requireWorkspace, isDemo, todayIn } from '../auth';
import { compute } from '../finance/core.js';
import { demoData } from '../demo/fixture';
import type { CoreInput, Profile, Brand, Deal, Contact, Task, Contract, Agreement } from '../types';
import { flag } from '../flags';

function must<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw r.error;
  return (r.data ?? []) as T;
}

/** Loads everything the app needs for the signed-in workspace (or the read-only demo) and computes metrics once per request. */
export const loadApp = cache(async () => {
  const { sb, user, ws } = await requireWorkspace();
  const [{ data: admin }, { data: settings }] = await Promise.all([
    sb.from('admins').select('user_id').eq('user_id', user.id).maybeSingle(),
    sb.from('user_settings').select('*').eq('user_id', user.id).maybeSingle()
  ]);
  const prefs = { dailyBriefing: settings?.daily_briefing ?? true, emailDigest: settings?.email_digest ?? false, pushAlerts: settings?.push_alerts ?? false, analyticsOptIn: settings?.analytics_opt_in ?? false };
  let logoUrl: string | null = null;
  if (ws.logo_path) { const { data } = await sb.storage.from('logos').createSignedUrl(ws.logo_path, 3600); logoUrl = data?.signedUrl ?? null; }
  const brand: Brand = { name: ws.brand_name, accent: ws.accent, headlineFont: ws.headline_font, logoUrl };
  const realProfileRow = must<any>(await sb.from('creator_profiles').select('*').eq('workspace_id', ws.id).single());
  const realProfile = mapProfile(realProfileRow);
  const agreementsOn = flag('agreements') || !!admin;

  if (isDemo()) {
    const d = demoData();
    const demoBrands = Array.from(new Map(d.input.deals.map(x => [x.brandId, { id: x.brandId, name: x.brandName }])).values());
    return { brandList: demoBrands, user, ws, brand, prefs, isAdmin: !!admin, demo: true, contracts: d.contracts, agreements: [] as Agreement[], agreementsOn, invoiceSettings: { taxSetAsidePct: 25, paymentDetails: d.paymentDetails, email: '' }, readOnly: true, profile: d.profile, realProfile, input: d.input, metrics: compute(d.input), readKeys: [] as string[], checklistDone: [] as string[], advisorHistory: [] as any[] };
  }

  const w = ws.id;
  const [brands, deals, dels, invoices, payments, income, expenses, opps, aud, cats, atts, reads, checks, history, contacts, tasks, contracts, agreements] = await Promise.all([
    sb.from('brands').select('id,name').eq('workspace_id', w),
    sb.from('deals').select('*').eq('workspace_id', w).order('started_on', { ascending: false }),
    sb.from('deliverables').select('*').eq('workspace_id', w).order('due_on'),
    sb.from('invoices').select('*').eq('workspace_id', w),
    sb.from('payments').select('*').eq('workspace_id', w),
    sb.from('income_entries').select('*').eq('workspace_id', w),
    sb.from('expenses').select('*').eq('workspace_id', w),
    sb.from('opportunities').select('*').eq('workspace_id', w).order('created_at', { ascending: false }),
    sb.from('audience_snapshots').select('*').eq('workspace_id', w).order('captured_on'),
    sb.from('content_categories').select('*').eq('workspace_id', w),
    sb.from('attachments').select('id,deal_id,file_name').eq('workspace_id', w),
    sb.from('notification_reads').select('key').eq('workspace_id', w).eq('user_id', user.id),
    sb.from('checklist_state').select('key,done_on').eq('workspace_id', w),
    sb.from('advisor_messages').select('id,role,content,payload,created_at').eq('workspace_id', w).eq('user_id', user.id).order('created_at').limit(60),
    sb.from('contacts').select('*').eq('workspace_id', w).order('name'),
    sb.from('tasks').select('*').eq('workspace_id', w).order('created_at', { ascending: false }),
    flag('contracts') ? sb.from('contracts').select('*').eq('workspace_id', w).order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    // Tolerant of a deploy that lands before the agreements migration: the rest of the app keeps working.
    agreementsOn ? sb.from('agreements').select('*').eq('workspace_id', w).order('updated_at', { ascending: false }).then((r: any) => (r.error ? (console.error('[agreements] load', r.error.code), { data: [], error: null }) : r)) : Promise.resolve({ data: [], error: null })
  ]);
  const brandName = new Map(must<any[]>(brands).map(b => [b.id, b.name]));
  const delRows = must<any[]>(dels), attRows = must<any[]>(atts);
  const today = todayIn(ws.timezone);
  const input: CoreInput = {
    today,
    deals: must<any[]>(deals).map((d): Deal => ({
      id: d.id, brandId: d.brand_id, brandName: brandName.get(d.brand_id) ?? 'Unknown brand', agency: d.agency, contactName: d.contact_name, contactEmail: d.contact_email,
      campaign: d.campaign, description: d.description, feeCents: Number(d.fee_cents), feeIsEstimate: d.fee_is_estimate, stage: d.stage, platforms: d.platforms,
      contentCategory: d.content_category, contractStatus: d.contract_status, usageRights: d.usage_rights, exclusivity: d.exclusivity, paymentTerms: d.payment_terms,
      notes: d.notes, startedOn: d.started_on, completedOn: d.completed_on, lastContactOn: d.last_contact_on, contactId: d.contact_id ?? null,
      dealType: d.deal_type ?? 'sponsored', giftedValueCents: Number(d.gifted_value_cents ?? 0), commissionTerms: d.commission_terms ?? '', paymentSchedule: d.payment_schedule ?? 'single', paymentTrigger: d.payment_trigger ?? '', scheduleNote: d.schedule_note ?? '',
      deliverables: delRows.filter(x => x.deal_id === d.id).map(x => ({ id: x.id, dealId: x.deal_id, name: x.name, dueOn: x.due_on, status: x.status, notes: x.notes,
        platform: x.platform ?? '', submitBy: x.submit_by ?? null, submittedOn: x.submitted_on ?? null, publishedOn: x.published_on ?? null, revisions: x.revisions ?? 0, contentUrl: x.content_url ?? '' })),
      attachments: attRows.filter(a => a.deal_id === d.id).map(a => ({ id: a.id, fileName: a.file_name }))
    })),
    invoices: must<any[]>(invoices).map(v => ({ id: v.id, number: v.number, dealId: v.deal_id, clientName: v.client_name, description: v.description, stream: v.stream, amountCents: Number(v.amount_cents), issuedOn: v.issued_on, dueOn: v.due_on, terms: v.terms, voidedAt: v.voided_at, shareToken: v.share_token ?? null, sentAt: v.sent_at ?? null, billToEmail: v.bill_to_email ?? '' })),
    payments: must<any[]>(payments).map(p => ({ id: p.id, invoiceId: p.invoice_id, amountCents: Number(p.amount_cents), receivedOn: p.received_on, note: p.note })),
    income: must<any[]>(income).map(e => ({ id: e.id, stream: e.stream, amountCents: Number(e.amount_cents), receivedOn: e.received_on, counterparty: e.counterparty, description: e.description })),
    expenses: must<any[]>(expenses).map(x => ({ id: x.id, category: x.category, amountCents: Number(x.amount_cents), spentOn: x.spent_on, note: x.note })),
    goals: { monthlyCents: Number(ws.monthly_goal_cents), annualCents: Number(ws.annual_goal_cents) },
    opportunities: must<any[]>(opps).map(o => ({ id: o.id, name: o.name, category: o.category, location: o.location, fit: o.fit, source: o.source, angle: o.angle, status: o.status })),
    audience: must<any[]>(aud).map(a => ({ id: a.id, platform: a.platform, followers: a.followers, engagementRate: a.engagement_rate === null ? null : Number(a.engagement_rate), avgViews: a.avg_views, capturedOn: a.captured_on })),
    categories: must<any[]>(cats).map(c => ({ id: c.id, name: c.name, avgViews: c.avg_views, posts: c.posts })),
    contacts: must<any[]>(contacts).map((c): Contact => ({ id: c.id, brandId: c.brand_id, brandName: c.brand_id ? brandName.get(c.brand_id) ?? null : null, name: c.name, email: c.email, role: c.role, phone: c.phone, notes: c.notes, lastContactedOn: c.last_contacted_on, followUpOn: c.follow_up_on })),
    tasks: must<any[]>(tasks).map((t): Task => ({ id: t.id, title: t.title, notes: t.notes, dueOn: t.due_on, status: t.status, priority: t.priority, dealId: t.deal_id, contactId: t.contact_id, invoiceId: t.invoice_id, completedAt: t.completed_at }))
  };
  return {
    brandList: must<any[]>(brands).map(b => ({ id: b.id as string, name: b.name as string })),
    user, ws, brand, prefs, isAdmin: !!admin, demo: false, readOnly: false, profile: realProfile, realProfile, input, metrics: compute(input),
    contracts: must<any[]>(contracts).map(mapContract), agreements: must<any[]>(agreements).map(mapAgreement), agreementsOn,
    invoiceSettings: { taxSetAsidePct: Number(ws.tax_set_aside_pct ?? 25), paymentDetails: ws.invoice_payment_details ?? '', email: ws.invoice_email ?? '' },
    readKeys: must<any[]>(reads).map(r => r.key), checklistDone: must<any[]>(checks).filter(c => c.done_on === today).map(c => c.key),
    advisorHistory: must<any[]>(history)
  };
});

export function mapAgreement(a: any): Agreement {
  return { id: a.id, dealId: a.deal_id, status: a.status, title: a.title, sourceText: a.source_text, extracted: a.extracted && Object.keys(a.extracted).length ? a.extracted : null,
    terms: a.terms ?? {}, body: a.body, bodySha256: a.body_sha256, shareToken: a.share_token, creatorName: a.creator_name, creatorEmail: a.creator_email,
    creatorSignature: a.creator_signature, creatorSignedAt: a.creator_signed_at, sentAt: a.sent_at, firstViewedAt: a.first_viewed_at,
    signerName: a.signer_name, signerTitle: a.signer_title, signerEmail: a.signer_email, signerSignature: a.signer_signature, signedAt: a.signed_at, voidedAt: a.voided_at,
    audit: Array.isArray(a.audit) ? a.audit : [], createdAt: a.created_at, updatedAt: a.updated_at };
}

export function mapContract(c: any): Contract {
  return { id: c.id, dealId: c.deal_id, status: c.status, title: c.title, fileName: c.file_name, hasFile: !!c.storage_path, brandName: c.brand_name,
    feeCents: c.fee_cents === null ? null : Number(c.fee_cents), paymentTerms: c.payment_terms, signedOn: c.signed_on,
    usageRights: c.usage_rights, usageStartsOn: c.usage_starts_on, usageEndsOn: c.usage_ends_on,
    exclusivity: c.exclusivity, exclusivityStartsOn: c.exclusivity_starts_on, exclusivityEndsOn: c.exclusivity_ends_on,
    whitelisting: c.whitelisting, revisions: c.revisions, killFee: c.kill_fee, otherTerms: c.other_terms,
    extracted: c.extracted && Object.keys(c.extracted).length ? c.extracted : null, confirmedAt: c.confirmed_at, createdAt: c.created_at };
}

export function mapProfile(p: any): Profile {
  return { displayName: p.display_name, businessName: p.business_name, niche: p.niche, location: p.location, platforms: p.platforms, followerRange: p.follower_range,
    revenueStreams: p.revenue_streams, hasManager: p.has_manager, businessStructure: p.business_structure, priority: p.priority,
    onboardingStep: p.onboarding_step, onboardingCompletedAt: p.onboarding_completed_at };
}

export type AppData = Awaited<ReturnType<typeof loadApp>>;
