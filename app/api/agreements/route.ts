import { NextResponse } from 'next/server';
import { requireWritable, friendlyError, UserError } from '@/lib/auth';
import { getProvider, AIUnavailable } from '@/lib/ai/provider';
import { checkAndCountAI } from '@/lib/ai/ratelimit';
import { parseExtraction } from '@/lib/ai/contracts';
import { AGREEMENT_SYSTEM, AGREEMENT_INSTRUCTION } from '@/lib/ai/agreements';
import { extractionToTerms } from '@/lib/agreements/terms';
import { agreementTitle } from '@/lib/agreements/template';
import { agreementsAllowed } from '@/lib/agreements/access';
import type { ContractExtraction } from '@/lib/types';

const MAX_IMAGE = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const maxDuration = 120;
/** Long email threads fit: about 50 pages. Same limit as a pasted contract; the database allows the same. */
const MAX_MESSAGE = 200_000;

/**
 * Generate a draft agreement from a brand email, note or DM (pasted text) or a screenshot of one.
 * The AI only proposes terms; the agreement text comes from the fixed template, and nothing is signed or sent here.
 * Screenshots are read and not stored.
 */
export async function POST(req: Request) {
  try {
    const { sb, ws, user } = await requireWritable();
    if (!(await agreementsAllowed(sb, user.id))) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    const form = await req.formData();
    const file = form.get('image'), pasted = String(form.get('text') ?? '').trim();
    let text: string | undefined, image: { base64: string; mediaType: string } | undefined;
    if (file instanceof File && file.size > 0) {
      if (!IMAGE_TYPES.includes(file.type)) throw new UserError('Upload a screenshot as PNG, JPG, WEBP or GIF, or paste the message text.');
      if (file.size > MAX_IMAGE) throw new UserError('Screenshots must be under 5 MB.');
      image = { base64: Buffer.from(await file.arrayBuffer()).toString('base64'), mediaType: file.type };
    } else if (pasted) {
      if (pasted.length > MAX_MESSAGE) throw new UserError('That thread is over 200,000 characters (about 50 pages). Paste the messages about this deal.');
      text = pasted;
    } else throw new UserError('Paste the message, or upload a screenshot of it.');

    // Optional: generated from a partnership. Its brand, campaign and fee fill any gaps the message leaves.
    const dealIdRaw = String(form.get('dealId') ?? '').trim();
    let deal: { id: string; brandName: string; campaign: string; feeCents: number } | null = null;
    if (dealIdRaw) {
      if (!/^[0-9a-f-]{36}$/i.test(dealIdRaw)) throw new UserError('That partnership wasn’t found.');
      const { data: d } = await sb.from('deals').select('id,brand_id,campaign,fee_cents').eq('id', dealIdRaw).eq('workspace_id', ws.id).maybeSingle();
      if (!d) throw new UserError('That partnership wasn’t found.');
      const { data: b } = d.brand_id ? await sb.from('brands').select('name').eq('id', d.brand_id).eq('workspace_id', ws.id).maybeSingle() : { data: null };
      deal = { id: d.id, brandName: b?.name ?? '', campaign: d.campaign ?? '', feeCents: Number(d.fee_cents ?? 0) };
    }

    // Read it. If the AI is unavailable or over the hourly cap, the draft is still created for manual entry.
    const source = image ? 'image' : 'text';
    let extraction: ContractExtraction;
    if (!(await checkAndCountAI(sb, user.id, 'contract'))) {
      extraction = { source, fields: {}, deliverables: [], warnings: ['You have reached the hourly AI limit, so this one wasn’t read automatically. Fill in the terms by hand, or try again later.'] };
    } else {
      try {
        const out = await getProvider().readDocument({ system: AGREEMENT_SYSTEM, instruction: AGREEMENT_INSTRUCTION, text, image, maxTokens: 4000 });
        extraction = parseExtraction(out.text, source, text);
        if (out.stopReason === 'max_tokens') extraction.warnings.push('The message was long, so the read may be incomplete. Check every term, especially deliverables.');
        if (!text) extraction.warnings.push('Read from a screenshot. Check each term against the original message.');
      } catch (e) {
        if (!(e instanceof AIUnavailable)) console.error('[agreements] read failed', (e as Error)?.name);
        extraction = { source, fields: {}, deliverables: [], warnings: ['The message couldn’t be read automatically right now. Fill in the terms by hand.'] };
      }
    }

    const [{ data: profile }] = await Promise.all([sb.from('creator_profiles').select('display_name,business_name').eq('workspace_id', ws.id).maybeSingle()]);
    const creatorName = (profile?.display_name || profile?.business_name || '').trim();
    const creatorEmail = (ws.invoice_email || user.email || '').trim();
    const terms = extractionToTerms(extraction, { creatorName, creatorEmail, deal });
    const { data, error } = await sb.from('agreements').insert({
      workspace_id: ws.id, deal_id: deal?.id ?? null, status: 'draft', title: agreementTitle(terms).slice(0, 200),
      source_text: text ?? '', extracted: extraction, terms,
      audit: [{ event: 'created', at: new Date().toISOString(), by: creatorName || user.email, source }]
    }).select('id').single();
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 400 });
  }
}
