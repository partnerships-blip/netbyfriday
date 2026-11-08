'use server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { sendWaitlistAlert } from '@/lib/notify/founder';

const Schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  name: z.string().trim().max(120).default(''), handle: z.string().trim().max(80).default(''), creatorType: z.string().trim().max(80).default(''),
  consent: z.literal('on', { errorMap: () => ({ message: 'Please agree so we can email you about your invite.' }) }),
  company: z.string().max(0).optional(), startedAt: z.coerce.number().optional(), source: z.string().max(80).default('website')
});
export type WaitlistState = { ok?: boolean; already?: boolean; error?: string };

export async function joinWaitlist(_: WaitlistState, form: FormData): Promise<WaitlistState> {
  const raw = Object.fromEntries(form.entries());
  // Bots: a filled honeypot or an instant submit gets a quiet "success" and nothing is stored.
  if (raw.company || (raw.startedAt && Date.now() - Number(raw.startedAt) < 1500)) return { ok: true };
  const p = Schema.safeParse(raw);
  if (!p.success) return { error: p.error.issues[0].message };
  const v = p.data;
  const { data, error } = await createClient().rpc('join_waitlist', { p_email: v.email, p_name: v.name, p_handle: v.handle, p_creator_type: v.creatorType, p_source: v.source, p_consent: true });
  if (error) { console.error('[waitlist]', error.message); return { error: 'Something went wrong. Please try again in a minute.' }; }
  if (data === 'already') return { ok: true, already: true };
  await sendWaitlistAlert({ email: v.email, name: v.name, handle: v.handle, creatorType: v.creatorType, source: v.source });   // never blocks the request
  return { ok: true };
}
