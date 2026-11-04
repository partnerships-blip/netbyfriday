import 'server-only';
import { cache } from 'react';
import { requireWorkspace, isDemo, todayIn } from '../auth';
import { compute } from '../finance/core.js';
import { demoData } from '../demo/fixture';
import type { CoreInput, Profile, Brand, Deal } from '../types';

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

  if (isDemo()) {
    const d = demoData();
    return { user, ws, brand, prefs, isAdmin: !!admin, demo: true, readOnly: true, profile: d.profile, realProfile, input: d.input, metrics: compute(d.input), readKeys: [] as string[], checklistDone: [] as string[], advisorHistory: [] as any[] };
  }

  const w = ws.id;
  const [brands, deals, dels, invoices, payments, income, expenses, opps, aud, cats, atts, reads, checks, history] = await Promise.all([
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
    sb.from('advisor_messages').select('id,role,content,payload,created_at').eq('workspace_id', w).eq('user_id', user.id).order('created_at').limit(60)
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
      notes: d.notes, startedOn: d.started_on, completedOn: d.completed_on, lastContactOn: d.last_contact_on,
      deliverables: delRows.filter(x => x.deal_id === d.id).map(x => ({ id: x.id, dealId: x.deal_id, name: x.name, dueOn: x.due_on, status: x.status, notes: x.notes })),
      attachments: attRows.filter(a => a.deal_id === d.id).map(a => ({ id: a.id, fileName: a.file_name }))
    })),
    invoices: must<any[]>(invoices).map(v => ({ id: v.id, number: v.number, dealId: v.deal_id, clientName: v.client_name, description: v.description, stream: v.stream, amountCents: Number(v.amount_cents), issuedOn: v.issued_on, dueOn: v.due_on, terms: v.terms, voidedAt: v.voided_at })),
    payments: must<any[]>(payments).map(p => ({ id: p.id, invoiceId: p.invoice_id, amountCents: Number(p.amount_cents), receivedOn: p.received_on, note: p.note })),
    income: must<any[]>(income).map(e => ({ id: e.id, stream: e.stream, amountCents: Number(e.amount_cents), receivedOn: e.received_on, counterparty: e.counterparty, description: e.description })),
    expenses: must<any[]>(expenses).map(x => ({ id: x.id, category: x.category, amountCents: Number(x.amount_cents), spentOn: x.spent_on, note: x.note })),
    goals: { monthlyCents: Number(ws.monthly_goal_cents), annualCents: Number(ws.annual_goal_cents) },
    opportunities: must<any[]>(opps).map(o => ({ id: o.id, name: o.name, category: o.category, location: o.location, fit: o.fit, source: o.source, angle: o.angle, status: o.status })),
    audience: must<any[]>(aud).map(a => ({ id: a.id, platform: a.platform, followers: a.followers, engagementRate: a.engagement_rate === null ? null : Number(a.engagement_rate), avgViews: a.avg_views, capturedOn: a.captured_on })),
    categories: must<any[]>(cats).map(c => ({ id: c.id, name: c.name, avgViews: c.avg_views, posts: c.posts }))
  };
  return {
    user, ws, brand, prefs, isAdmin: !!admin, demo: false, readOnly: false, profile: realProfile, realProfile, input, metrics: compute(input),
    readKeys: must<any[]>(reads).map(r => r.key), checklistDone: must<any[]>(checks).filter(c => c.done_on === today).map(c => c.key),
    advisorHistory: must<any[]>(history)
  };
});

export function mapProfile(p: any): Profile {
  return { displayName: p.display_name, businessName: p.business_name, niche: p.niche, location: p.location, platforms: p.platforms, followerRange: p.follower_range,
    revenueStreams: p.revenue_streams, hasManager: p.has_manager, businessStructure: p.business_structure, priority: p.priority,
    onboardingStep: p.onboarding_step, onboardingCompletedAt: p.onboarding_completed_at };
}

export type AppData = Awaited<ReturnType<typeof loadApp>>;
