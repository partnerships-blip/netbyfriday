import 'server-only';
import { flag } from '../flags';

/** The contract generator is on for everyone when the 'agreements' flag is on, and for beta admins before that. */
export async function agreementsAllowed(sb: any, userId: string): Promise<boolean> {
  if (flag('agreements')) return true;
  const { data } = await sb.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
  return !!data;
}
