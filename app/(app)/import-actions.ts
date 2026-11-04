'use server';
// Copies records saved by the browser prototype into the signed-in user's workspace.
// Runs only when the user explicitly confirms. Demo data is never imported. Re-running is safe: import_ref prevents duplicates.
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireWritable, friendlyError, todayIn } from '@/lib/auth';
import { ensureBrand } from '@/lib/data/brands';
import { track } from '@/lib/analytics';
import type { ActionResult } from '@/lib/types';

const STAGE: Record<string, string> = { 'Lead': 'lead', 'New Inquiry': 'lead', 'Pitching': 'pitching', 'Negotiating': 'negotiating', 'Contract Sent': 'negotiating', 'Contracted': 'contracted', 'Confirmed': 'contracted', 'In Progress': 'in_progress', 'Content Submitted': 'in_progress', 'Completed': 'completed', 'Paid': 'paid', 'Lost / Declined': 'lost' };
const DSTATUS: Record<string, string> = { 'Not started': 'not_started', 'In progress': 'in_progress', 'In review': 'in_review', 'Approved': 'approved', 'Posted': 'posted', 'Scheduled': 'scheduled' };
const OSTATUS: Record<string, string> = { New: 'new', Saved: 'saved', Dismissed: 'dismissed' };
const STREAMS = ['brand', 'affiliate', 'events', 'digital', 'appearances', 'other'];

const s = (max: number) => z.string().max(max).catch('').default('');
const dollars = z.coerce.number().finite().min(0).max(1e9).catch(0);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined);
const Proto = z.object({
  deals: z.array(z.object({ id: s(60), brand: z.string().min(1).max(120), agency: s(120), contact: s(120), email: s(254), campaign: s(200), desc: s(5000), fee: dollars, stage: s(40), platforms: z.array(z.string().max(40)).max(10).catch([]),
    contract: s(200), usage: s(500), exclusivity: s(500), terms: s(200), notes: s(10000), date, lastContact: date, completed: date,
    deliverables: z.array(z.object({ id: s(60), name: z.string().min(1).max(200), due: date, status: s(40), notes: s(2000) })).max(50).catch([]) })).max(500).catch([]),
  invoices: z.array(z.object({ id: s(40), client: z.string().min(1).max(160), dealId: z.string().max(60).nullable().catch(null), amount: dollars, issued: date, due: date, terms: s(60), desc: s(2000),
    payments: z.array(z.object({ date: date, amount: dollars })).max(50).catch([]) })).max(500).catch([]),
  revenue: z.record(z.array(dollars).max(12)).catch({}),
  expenses: z.array(z.object({ cat: z.string().min(1).max(120), amount: dollars })).max(200).catch([]),
  opps: z.array(z.object({ id: s(60), name: z.string().min(1).max(160), cat: s(80), loc: s(120), fit: s(2000), source: s(300), angle: s(2000), status: s(20) })).max(200).catch([]),
  goals: z.object({ monthly: dollars, annual: dollars }).partial().catch({})
});
const Options = z.object({ anchorMonth: z.string().regex(/^\d{4}-\d{2}$/), includeRevenue: z.boolean(), includeBrandRevenue: z.boolean(), confirmed: z.literal(true) });
const cents = (d: number) => Math.round(d * 100);

export async function importPrototype(raw: unknown, rawOptions: unknown): Promise<ActionResult> {
  try {
    const opt = Options.parse(rawOptions);
    const data = Proto.parse(raw);
    const c = await requireWritable();
    const w = c.ws.id, today = todayIn(c.ws.timezone);
    let counts = { deals: 0, invoices: 0, payments: 0, income: 0, expenses: 0, opps: 0 };
    const dealMap = new Map<string, string>();

    for (const d of data.deals) {
      const brand_id = await ensureBrand(c, d.brand);
      const stage = STAGE[d.stage] ?? 'lead';
      const { data: rows, error } = await c.sb.from('deals').upsert({ workspace_id: w, brand_id, agency: d.agency, contact_name: d.contact, contact_email: d.email, campaign: d.campaign, description: d.desc, fee_cents: cents(d.fee), fee_is_estimate: stage === 'lead',
        stage, platforms: d.platforms, contract_status: d.contract === '—' ? '' : d.contract, usage_rights: d.usage === '—' ? '' : d.usage, exclusivity: d.exclusivity === '—' ? '' : d.exclusivity, payment_terms: d.terms === '—' ? '' : d.terms,
        notes: d.notes, started_on: d.date ?? today, last_contact_on: d.lastContact ?? d.date ?? today, completed_on: d.completed ?? null, import_ref: 'proto:deal:' + d.id }, { onConflict: 'workspace_id,import_ref', ignoreDuplicates: true }).select('id');
      if (error) throw error;
      if (rows?.length) {
        counts.deals++;
        dealMap.set(d.id, rows[0].id);
        const dels = d.deliverables.map(x => ({ workspace_id: w, deal_id: rows[0].id, name: x.name, due_on: x.due ?? today, status: DSTATUS[x.status] ?? 'not_started', notes: x.notes }));
        if (dels.length) { const r = await c.sb.from('deliverables').insert(dels); if (r.error) throw r.error; }
      } else {
        const { data: ex } = await c.sb.from('deals').select('id').eq('workspace_id', w).eq('import_ref', 'proto:deal:' + d.id).single();
        if (ex) dealMap.set(d.id, ex.id);
      }
    }

    const { data: existingNums } = await c.sb.from('invoices').select('number').eq('workspace_id', w);
    const taken = new Set((existingNums ?? []).map((n: any) => n.number));
    for (const v of data.invoices) {
      if (v.amount <= 0) continue;
      const issued = v.issued ?? today, due = v.due && v.due >= issued ? v.due : issued;
      const number = taken.has(v.id) ? v.id + '-P' : v.id || 'P-' + Math.random().toString(36).slice(2, 8);
      const { data: rows, error } = await c.sb.from('invoices').upsert({ workspace_id: w, number, deal_id: v.dealId ? dealMap.get(v.dealId) ?? null : null, client_name: v.client, description: v.desc, stream: 'brand',
        amount_cents: cents(v.amount), issued_on: issued, due_on: due, terms: v.terms || 'Net 30', import_ref: 'proto:inv:' + v.id }, { onConflict: 'workspace_id,import_ref', ignoreDuplicates: true }).select('id');
      if (error) throw error;
      if (!rows?.length) continue;
      taken.add(number); counts.invoices++;
      let paid = 0;
      for (const p of v.payments) {
        const a = Math.min(cents(p.amount), cents(v.amount) - paid);
        if (a <= 0) continue;
        const r = await c.sb.from('payments').insert({ workspace_id: w, invoice_id: rows[0].id, amount_cents: a, received_on: p.date ?? issued, note: 'Imported from prototype' });
        if (r.error) throw r.error;
        paid += a; counts.payments++;
      }
    }

    if (opt.includeRevenue) {
      // Prototype stored 12 monthly totals by position; slot 11 is the month the prototype was last used (anchorMonth).
      const [ay, am] = opt.anchorMonth.split('-').map(Number);
      for (const stream of STREAMS) {
        if (stream === 'brand' && !opt.includeBrandRevenue) continue;
        const arr = (data.revenue as Record<string, number[]>)[stream] ?? [];
        for (let i = 0; i < arr.length; i++) {
          if (!(arr[i] > 0)) continue;
          const dt = new Date(Date.UTC(ay, am - 1 - (11 - i), 15)).toISOString().slice(0, 10);
          if (dt > today) continue;
          const r = await c.sb.from('income_entries').upsert({ workspace_id: w, stream, amount_cents: cents(arr[i]), received_on: dt, description: 'Monthly total imported from prototype', import_ref: `proto:rev:${stream}:${dt.slice(0, 7)}` }, { onConflict: 'workspace_id,import_ref', ignoreDuplicates: true }).select('id');
          if (r.error) throw r.error;
          counts.income += r.data?.length ?? 0;
        }
      }
    }
    for (const [i, x] of data.expenses.entries()) {
      if (x.amount <= 0) continue;
      const r = await c.sb.from('expenses').upsert({ workspace_id: w, category: x.cat, amount_cents: cents(x.amount), spent_on: today, note: 'Imported total from prototype', import_ref: `proto:exp:${i}:${x.cat}` }, { onConflict: 'workspace_id,import_ref', ignoreDuplicates: true }).select('id');
      if (r.error) throw r.error; counts.expenses += r.data?.length ?? 0;
    }
    for (const o of data.opps) {
      const r = await c.sb.from('opportunities').upsert({ workspace_id: w, name: o.name, category: o.cat || 'Potential new brand outreach', location: o.loc, fit: o.fit, source: o.source || 'Imported from prototype', angle: o.angle, status: OSTATUS[o.status] ?? 'new', import_ref: 'proto:opp:' + o.id }, { onConflict: 'workspace_id,import_ref', ignoreDuplicates: true }).select('id');
      if (r.error) throw r.error; counts.opps += r.data?.length ?? 0;
    }
    if (data.goals.monthly || data.goals.annual) {
      const { data: wsNow } = await c.sb.from('workspaces').select('monthly_goal_cents,annual_goal_cents').eq('id', w).single();
      if (!Number(wsNow?.monthly_goal_cents) && !Number(wsNow?.annual_goal_cents)) await c.sb.from('workspaces').update({ monthly_goal_cents: cents(data.goals.monthly ?? 0), annual_goal_cents: cents(data.goals.annual ?? 0) }).eq('id', w);
    }
    await track(c, 'prototype_imported');
    revalidatePath('/', 'layout');
    return { ok: true, message: `Imported ${counts.deals} partnerships, ${counts.invoices} invoices, ${counts.payments} payments, ${counts.income} income entries, ${counts.expenses} expenses, ${counts.opps} opportunities.` };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}
