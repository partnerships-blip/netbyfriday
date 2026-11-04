import 'server-only';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { createClient } from './supabase/server';

export class UserError extends Error {}

export const requireUser = cache(async () => {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');
  return { sb, user };
});

/** Signed-in user with beta access and their workspace. RLS guarantees they can only read their own rows. */
export const requireWorkspace = cache(async () => {
  const { sb, user } = await requireUser();
  const [{ data: access }, { data: ws, error }] = await Promise.all([
    sb.from('beta_access').select('user_id').eq('user_id', user.id).maybeSingle(),
    sb.from('workspaces').select('*').eq('owner_id', user.id).maybeSingle()
  ]);
  if (!access || error || !ws) redirect('/login?error=access');
  return { sb, user, ws };
});

export const isDemo = () => cookies().get('ci_demo')?.value === '1';

/** For mutations: same as requireWorkspace, but refuses while demo mode is on. */
export async function requireWritable() {
  if (isDemo()) throw new UserError('Demo mode is read-only. Switch to your workspace to make changes.');
  return requireWorkspace();
}

export function todayIn(tz: string) {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  catch { return new Date().toISOString().slice(0, 10); }
}

/** Maps any thrown value to a message that is safe to show a user. Internal details are logged, not returned. */
export function friendlyError(e: unknown): string {
  if (e instanceof UserError) return e.message;
  const any = e as { name?: string; issues?: { message: string }[]; code?: string; message?: string };
  if (any?.name === 'ZodError' && any.issues?.length) return any.issues[0].message;
  const msg = any?.message || '';
  if (msg.includes('PAYMENT_EXCEEDS_BALANCE')) return 'That payment is more than the invoice balance.';
  if (msg.includes('INVOICE_VOID')) return 'This invoice is void. Payments cannot be added.';
  if (msg.includes('VOID_WITH_PAYMENTS')) return 'This invoice has payments recorded, so it cannot be voided. Delete the payments first.';
  if (msg.includes('AMOUNT_BELOW_PAID')) return 'The invoice amount cannot be less than what has already been paid.';
  if (any?.code === '23505') return 'A record with that name or number already exists.';
  if (any?.code === '42501' || any?.code === 'PGRST301') return 'You do not have access to that record.';
  if (any?.code === '23503') return 'That record is linked to something that no longer exists.';
  console.error('[action error]', e);
  return 'Something went wrong. Nothing was saved.';
}
