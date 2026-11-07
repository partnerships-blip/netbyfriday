import { createClient } from '@/lib/supabase/server';
import { waitlistCsv } from '@/lib/admin/waitlist-csv';

export const dynamic = 'force-dynamic';

/** Downloads the beta waitlist as CSV. Admin only: both functions check admin status in the database. */
export async function GET() {
  const sb = createClient();
  const [w, i] = await Promise.all([sb.rpc('admin_waitlist', { p_limit: 1000 }), sb.rpc('admin_invites')]);
  if (w.error || i.error) {
    const denied = [w.error, i.error].some(e => e && (e.code === '42501' || /NOT_ADMIN|JWT|auth/i.test(e.message)));
    return new Response(denied ? 'Not found' : 'Couldn’t load the waitlist. Try again.', { status: denied ? 404 : 500 });
  }
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(waitlistCsv(w.data ?? [], i.data ?? []), { headers: {
    'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="netbyfriday-waitlist-${stamp}.csv"`,
    'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } });
}
