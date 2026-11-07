import { toCsv } from '../csv-cell';
// Waitlist export for the founder: every early-access request, its invite, and whether the invite was used.
export type WaitRow = { email: string; name: string; handle: string; creator_type: string; source: string; consent_at: string; created_at: string; invited_at: string | null; invite_code: string | null };
export type InviteRow = { code: string; uses: number; expires_at: string | null };

const day = (t: string | null) => (t ? t.slice(0, 10) : '');
export function waitlistCsv(rows: WaitRow[], invites: InviteRow[], now = new Date()): string {
  const byCode = new Map(invites.map(i => [i.code, i]));
  const status = (r: WaitRow) => {
    if (!r.invite_code) return 'Waiting';
    const i = byCode.get(r.invite_code);
    if (i && i.uses > 0) return 'Signed up';
    if (i?.expires_at && new Date(i.expires_at) < now) return 'Invite expired';
    return 'Invited';
  };
  const sorted = [...rows].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  return toCsv([
    ['Requested on', 'Email', 'Name', 'Handle', 'Creator type', 'How they heard', 'Status', 'Invited on', 'Invite code', 'Invite expires', 'Consented on'],
    ...sorted.map(r => { const i = r.invite_code ? byCode.get(r.invite_code) : undefined;
      return [day(r.created_at), r.email, r.name, r.handle, r.creator_type, r.source, status(r), day(r.invited_at), r.invite_code ?? '', day(i?.expires_at ?? null), day(r.consent_at)]; })
  ]);
}
