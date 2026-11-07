import 'server-only';
import { flag } from '@/lib/flags';
import { requireUser } from '@/lib/auth';

/** Content Intelligence is on for everyone when the contentIntel flag is set; until then, only for beta admins
 *  (so the founder can test it in production without anyone else seeing it). */
export async function contentIntelAllowed(): Promise<boolean> {
  if (flag('contentIntel')) return true;
  const { sb, user } = await requireUser();
  const { data } = await sb.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  return !!data;
}
