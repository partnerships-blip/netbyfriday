import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const Body = z.object({
  hash: z.string().regex(/^[0-9a-f]{64}$/), name: z.string().trim().min(2).max(120), title: z.string().trim().max(120).default(''),
  email: z.string().trim().email().max(200), signature: z.string().trim().min(2).max(120), consent: z.boolean()
});
const MESSAGES: Record<string, string> = {
  AGREEMENT_NOT_OPEN: 'This agreement is no longer open for signing. It may already be signed, or the sender voided it.',
  AGREEMENT_CHANGED: 'This agreement changed since you opened it. Reload the page and review it again.',
  CONSENT_REQUIRED: 'Check the box to agree to sign electronically.',
  SIGNER_NAME_REQUIRED: 'Enter your full name.', SIGNATURE_REQUIRED: 'Type your name to sign.', SIGNER_EMAIL_REQUIRED: 'Enter a valid email.'
};

/** A brand signs from the creator's link. Everything is checked again inside sign_agreement(); this route adds the IP and browser. */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.token)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Fill in your name, a valid email and your typed signature.' }, { status: 400 });
  const v = parsed.data;
  const { error } = await createClient().rpc('sign_agreement', {
    p_token: params.token, p_hash: v.hash, p_name: v.name, p_title: v.title, p_email: v.email, p_signature: v.signature, p_consent: v.consent,
    p_ip: (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim(), p_ua: req.headers.get('user-agent') ?? ''
  });
  if (error) {
    const code = Object.keys(MESSAGES).find(k => error.message?.includes(k));
    if (!code) console.error('[sign] failed', error.code);
    return NextResponse.json({ error: code ? MESSAGES[code] : 'The agreement could not be signed. Nothing was saved.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
