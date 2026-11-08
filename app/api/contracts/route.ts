import { partnershipTitle } from '@/lib/agreements/template';
import { NextResponse } from 'next/server';
import { requireWritable, friendlyError, UserError } from '@/lib/auth';
import { flag } from '@/lib/flags';
import { getProvider, AIUnavailable } from '@/lib/ai/provider';
import { checkAndCountAI } from '@/lib/ai/ratelimit';
import { CONTRACT_SYSTEM, CONTRACT_INSTRUCTION, parseExtraction, proposalToForm } from '@/lib/ai/contracts';
import { parseMoneyToCents } from '@/lib/finance/core.js';
import type { ContractExtraction } from '@/lib/types';

const MAX = 10 * 1024 * 1024;
export const maxDuration = 120;

/**
 * Upload a contract (PDF or plain text, or pasted text). The file is stored privately in the workspace's folder,
 * the AI proposes terms, and a contract is saved in "review". Nothing else changes until the creator confirms.
 */
export async function POST(req: Request) {
  if (!flag('contracts')) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  let cleanup: (() => Promise<unknown>) | null = null;
  try {
    const { sb, ws, user } = await requireWritable();
    const form = await req.formData();
    const file = form.get('file'), pasted = String(form.get('text') ?? '').trim();
    // Uploaded from a partnership: the contract starts linked to it, and review defaults to that partnership.
    const dealIdRaw = String(form.get('dealId') ?? '').trim();
    let deal: { id: string; brandName: string } | null = null;
    if (dealIdRaw) {
      if (!/^[0-9a-f-]{36}$/i.test(dealIdRaw)) throw new UserError('That partnership wasn’t found.');
      const { data: d } = await sb.from('deals').select('id,brand_id').eq('id', dealIdRaw).eq('workspace_id', ws.id).maybeSingle();
      if (!d) throw new UserError('That partnership wasn’t found.');
      const { data: b } = d.brand_id ? await sb.from('brands').select('name').eq('id', d.brand_id).eq('workspace_id', ws.id).maybeSingle() : { data: null };
      deal = { id: d.id, brandName: b?.name ?? '' };
    }
    let pdfBase64: string | undefined, text: string | undefined, fileName = '', storagePath: string | null = null, fileNote = '';

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX) throw new UserError('Contracts must be under 10 MB.');
      fileName = file.name.replace(/[^\w.\- ]+/g, '_').slice(-120);
      if (file.type === 'application/pdf') pdfBase64 = Buffer.from(await file.arrayBuffer()).toString('base64');
      else if (file.type === 'text/plain') text = await file.text();
      else throw new UserError('Upload a PDF, or paste the contract text. (For a Word file, use File → Save as PDF.)');
      // Keep the original privately. If storage is unavailable, still read the terms and say the file wasn't kept.
      const path = `${ws.id}/contracts/${crypto.randomUUID()}.${pdfBase64 ? 'pdf' : 'txt'}`;
      const up = await sb.storage.from('attachments').upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) { console.error('[contracts] storage upload failed', up.error.message); fileNote = 'The original file couldn’t be stored, so only the terms below were saved. Keep your own copy of the contract.'; }
      else { storagePath = path; cleanup = () => sb.storage.from('attachments').remove([path]); }
    } else if (pasted) {
      if (pasted.length > 200_000) throw new UserError('That text is too long. Paste just the agreement.');
      text = pasted;
    } else throw new UserError('Choose a contract file or paste its text.');

    // Read it. If the AI is unavailable or over the hourly cap, the contract is still saved for manual entry.
    let extraction: ContractExtraction;
    if (!(await checkAndCountAI(sb, user.id, 'contract'))) {
      extraction = { source: pdfBase64 ? 'pdf' : 'text', fields: {}, deliverables: [], warnings: ['You have reached the hourly AI limit, so this one wasn’t read automatically. Fill in the terms by hand, or try again later.'] };
    } else {
      try {
        const out = await getProvider().readDocument({ system: CONTRACT_SYSTEM, instruction: CONTRACT_INSTRUCTION, pdfBase64, text, maxTokens: 3000 });
        extraction = parseExtraction(out.text, pdfBase64 ? 'pdf' : 'text', text);
        if (out.stopReason === 'max_tokens') extraction.warnings.push('The contract is long; some terms may be missing. Check the full document.');
      } catch (e) {
        if (!(e instanceof AIUnavailable)) console.error('[contracts] read failed', (e as Error)?.name);
        extraction = { source: pdfBase64 ? 'pdf' : 'text', fields: {}, deliverables: [], warnings: [e instanceof AIUnavailable && e.message.includes('PDF') ? e.message : 'The contract couldn’t be read automatically right now. Fill in the terms by hand.'] };
      }
    }

    if (fileNote) extraction.warnings.unshift(fileNote);
    // Prefill the review form. These are proposals in a contract marked "review", not changes to any partnership or money record.
    const f = proposalToForm(extraction);
    const { data: profile } = await sb.from('creator_profiles').select('display_name,business_name').eq('workspace_id', ws.id).maybeSingle();
    const creatorName = (profile?.display_name || profile?.business_name || '').trim();
    const brandForTitle = (f.brandName || deal?.brandName || '').trim();
    const title = brandForTitle && creatorName ? partnershipTitle(brandForTitle, creatorName) : (f.title || fileName.replace(/\.(pdf|txt)$/i, '') || 'Pasted contract');
    const nul = (s: string) => s || null;
    const { data, error } = await sb.from('contracts').insert({
      workspace_id: ws.id, deal_id: deal?.id ?? null, status: 'review', title: title.slice(0, 200), file_name: fileName, storage_path: storagePath,
      extracted: extraction, brand_name: (f.brandName || deal?.brandName || '').slice(0, 160), fee_cents: f.fee ? parseMoneyToCents(f.fee) : null, payment_terms: f.paymentTerms.slice(0, 200), signed_on: nul(f.signedOn),
      usage_rights: f.usageRights.slice(0, 1000), usage_starts_on: nul(f.usageStartsOn), usage_ends_on: nul(f.usageEndsOn),
      exclusivity: f.exclusivity.slice(0, 1000), exclusivity_starts_on: nul(f.exclusivityStartsOn), exclusivity_ends_on: nul(f.exclusivityEndsOn),
      whitelisting: f.whitelisting.slice(0, 500), revisions: f.revisions.slice(0, 500), kill_fee: f.killFee.slice(0, 500), other_terms: f.otherTerms.slice(0, 5000)
    }).select('id').single();
    if (error) throw error;
    cleanup = null;
    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    if (cleanup) await cleanup().catch(() => {});
    return NextResponse.json({ error: friendlyError(e) }, { status: 400 });
  }
}
