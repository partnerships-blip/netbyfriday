'use server';
// Confirmed CSV import of partnerships or contacts. The browser shows a preview, but everything is parsed again here:
// rows are re-validated, duplicates re-checked against the database, and only clean rows are written.
// Import never creates invoices or payments, so nothing imported counts as revenue.
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireWritable, friendlyError, todayIn } from '@/lib/auth';
import { track } from '@/lib/analytics';
import { checkAll, MAX_ROWS, type DealRow, type ContactRow } from '@/lib/import/csv';
import { existingKeys } from '@/lib/import/existing';
import type { ActionResult } from '@/lib/types';

const Input = z.object({
  kind: z.enum(['deals', 'contacts']),
  fileName: z.string().max(200).catch(''),
  rows: z.array(z.array(z.string().max(10000)).max(60)).min(1, 'The file has no rows to import.').max(MAX_ROWS, `Import up to ${MAX_ROWS} rows at a time.`),
  map: z.record(z.number().int().min(0).max(59).nullable()),
  skipDuplicates: z.boolean(),
  confirmed: z.literal(true)
});

export async function importCsv(raw: unknown): Promise<ActionResult & { imported?: number; duplicates?: number; failed?: number }> {
  try {
    const v = Input.parse(raw);
    const c = await requireWritable();
    const w = c.ws.id, today = todayIn(c.ws.timezone);
    const checked = checkAll(v.kind, v.rows, v.map, new Set(await existingKeys(c, v.kind)));
    const failed = checked.filter(r => !r.value);
    const dups = checked.filter(r => r.value && r.duplicate);
    const take = checked.filter(r => r.value && (!r.duplicate || !v.skipDuplicates));
    if (!take.length) throw new Error(dups.length ? 'Every row is already in your workspace or repeated in the file. Nothing to import.' : 'No rows passed the checks. Fix the problems shown and try again.');

    // Brands: one lookup, then create the missing ones in one insert.
    const { data: brands, error: be } = await c.sb.from('brands').select('id,name').eq('workspace_id', w);
    if (be) throw be;
    const brandId = new Map((brands ?? []).map((b: any) => [b.name.trim().toLowerCase(), b.id as string]));
    const wanted = Array.from(new Set(take.map(r => ((r.value as any).brand as string).trim()).filter(Boolean)));
    const missing = wanted.filter(n => !brandId.has(n.toLowerCase()));
    if (missing.length) {
      const { data: made, error } = await c.sb.from('brands').insert(Array.from(new Map(missing.map(n => [n.toLowerCase(), n])).values()).map(n => ({ workspace_id: w, name: n.slice(0, 120) }))).select('id,name');
      if (error) throw error;
      for (const b of made ?? []) brandId.set(b.name.trim().toLowerCase(), b.id);
    }
    const bid = (n: string) => (n.trim() ? brandId.get(n.trim().toLowerCase()) ?? null : null);

    const runRef = `csv:${Date.now().toString(36)}:`;
    if (v.kind === 'deals') {
      const rows = take.map(r => { const d = r.value as DealRow; return {
        workspace_id: w, brand_id: bid(d.brand), campaign: d.campaign, fee_cents: d.feeCents, stage: d.stage, contact_name: d.contactName, contact_email: d.contactEmail,
        payment_terms: d.paymentTerms, notes: d.notes, started_on: d.startedOn ?? today, last_contact_on: d.startedOn ?? today,
        completed_on: ['completed', 'paid'].includes(d.stage) ? (d.startedOn ?? today) : null, import_ref: runRef + r.line }; });
      for (let i = 0; i < rows.length; i += 200) { const { error } = await c.sb.from('deals').insert(rows.slice(i, i + 200)); if (error) throw error; }
    } else {
      const rows = take.map(r => { const x = r.value as ContactRow; return { workspace_id: w, brand_id: bid(x.brand), name: x.name, email: x.email, role: x.role, phone: x.phone, notes: x.notes }; });
      for (let i = 0; i < rows.length; i += 200) { const { error } = await c.sb.from('contacts').insert(rows.slice(i, i + 200)); if (error) throw error; }
    }

    const problems = [...failed.map(r => ({ line: r.line, kind: 'error', text: r.errors.join('; ') })),
      ...(v.skipDuplicates ? dups.map(r => ({ line: r.line, kind: 'duplicate', text: r.duplicate === 'existing' ? 'Already in your workspace' : 'Repeated in the file' })) : []),
      ...take.filter(r => r.warnings.length).map(r => ({ line: r.line, kind: 'warning', text: r.warnings.join('; ') }))].sort((a, b) => a.line - b.line).slice(0, 300);
    const skipped = v.skipDuplicates ? dups.length : 0;
    const { error: he } = await c.sb.from('import_runs').insert({ workspace_id: w, kind: v.kind, file_name: v.fileName, total_rows: v.rows.length, imported: take.length, duplicates: skipped, failed: failed.length, problems });
    if (he) throw he;
    await track(c, 'csv_imported');
    revalidatePath('/', 'layout');
    const noun = v.kind === 'deals' ? (take.length === 1 ? 'partnership' : 'partnerships') : (take.length === 1 ? 'contact' : 'contacts');
    return { ok: true, imported: take.length, duplicates: skipped, failed: failed.length,
      message: `Imported ${take.length} ${noun}.${skipped ? ` Skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}.` : ''}${failed.length ? ` ${failed.length} row${failed.length === 1 ? '' : 's'} had problems and ${failed.length === 1 ? 'was' : 'were'} left out.` : ''}` };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}
