'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { friendlyError } from '@/lib/auth';
import type { ActionResult } from '@/lib/types';

const Invite = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{6,32}$/, 'Use 6–32 letters, numbers or dashes.'), maxUses: z.coerce.number().int().min(1).max(500), expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')), note: z.string().max(200) });

// Authorization is enforced inside the security-definer SQL functions (is_admin()), not just here.
export async function createInvite(raw: unknown): Promise<ActionResult> {
  try {
    const v = Invite.parse(raw);
    const { error } = await createClient().rpc('admin_create_invite', { p_code: v.code, p_max_uses: v.maxUses, p_expires_at: v.expiresAt ? v.expiresAt + 'T23:59:59Z' : null, p_note: v.note });
    if (error) throw error;
    revalidatePath('/admin');
    return { ok: true, message: `Invite ${v.code} created` };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}
export async function setFeedbackStatus(id: string, status: string): Promise<ActionResult> {
  try {
    z.string().uuid().parse(id); z.enum(['new', 'triaged', 'resolved']).parse(status);
    const { error } = await createClient().rpc('admin_set_feedback_status', { p_id: id, p_status: status });
    if (error) throw error;
    revalidatePath('/admin');
    return { ok: true };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function inviteFromWaitlist(id: string): Promise<ActionResult & { code?: string }> {
  try {
    z.string().uuid().parse(id);
    const { data, error } = await createClient().rpc('admin_invite_waitlist', { p_id: id });
    if (error) throw error;
    revalidatePath('/admin');
    return { ok: true, id: String(data), code: String(data), message: `Invite code ${data} created` };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}
