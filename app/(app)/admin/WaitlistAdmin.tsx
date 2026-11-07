'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Btn, Card, Eyebrow, Pill } from '@/components/ui';
import { useAction, toast } from '@/components/Toaster';
import { inviteFromWaitlist } from './admin-actions';

type Row = { id: string; email: string; name: string; handle: string; creator_type: string; created_at: string; invited_at: string | null; invite_code: string | null };
/** Waitlist with one-click invites. The invite email opens in the founder's own email app; netbyfriday sends nothing. */
export function WaitlistAdmin({ rows, signupUrl }: { rows: Row[]; signupUrl: string }) {
  const router = useRouter();
  const [pending, run] = useAction();
  const [show, setShow] = useState<'waiting' | 'invited'>('waiting');
  const list = rows.filter(r => (show === 'waiting' ? !r.invited_at : !!r.invited_at));
  const mail = (r: Row, code: string) => {
    const first = (r.name || '').split(' ')[0] || 'there';
    const body = `Hi ${first},\n\nYour spot in the netbyfriday private beta is ready.\n\n1. Go to ${signupUrl}\n2. Use your personal invite code: ${code}\n\nThe code works once and expires in 30 days. Reply to this email if you have any questions.\n\n`;
    return `mailto:${encodeURIComponent(r.email)}?subject=${encodeURIComponent('Your netbyfriday beta invite')}&body=${encodeURIComponent(body)}`;
  };
  const invite = (r: Row) => run(async () => {
    const res = await inviteFromWaitlist(r.id);
    if (res.ok && res.code) window.open(mail(r, res.code), '_blank');
    return res;
  }, () => router.refresh());
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Eyebrow className="mr-auto">Waitlist · {rows.filter(r => !r.invited_at).length} waiting · {rows.filter(r => r.invited_at).length} invited</Eyebrow>
        <a href="/api/admin/waitlist" download className="inline-flex h-8 items-center rounded-[8px] border border-line2 bg-white px-3 text-[13px] font-semibold">Download CSV</a>
        <div className="flex gap-1 rounded-[10px] bg-lavender p-[3px]">{(['waiting', 'invited'] as const).map(t => <button key={t} aria-pressed={show === t} onClick={() => setShow(t)} className={`h-8 rounded-[8px] px-3 text-[13px] font-semibold capitalize ${show === t ? 'bg-white' : 'text-sub'}`}>{t}</button>)}</div>
      </div>
      <p className="text-xs text-muted">Invite creates a single-use code (30 days) and opens a ready-to-send email in your own email app. Nothing is sent by netbyfriday.</p>
      <div className="flex flex-col">{list.map(r => (
        <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-soft2 py-2.5 text-sm">
          <span className="min-w-[200px] flex-1"><span className="font-semibold">{r.email}</span><span className="block text-xs text-muted">{[r.name, r.handle, r.creator_type].filter(Boolean).join(' · ') || '—'} · joined {r.created_at.slice(0, 10)}</span></span>
          {r.invite_code ? <>
            <span className="font-mono text-xs">{r.invite_code}</span><Pill tone="ok">Invited {r.invited_at?.slice(0, 10)}</Pill>
            <a href={mail(r, r.invite_code)} className="text-xs underline">Email again</a>
            <button className="text-xs underline" onClick={() => navigator.clipboard.writeText(r.invite_code!).then(() => toast('Code copied'))}>Copy code</button>
          </> : <Btn size="sm" variant="primary" disabled={pending} onClick={() => invite(r)}>Invite</Btn>}
        </div>))}
        {!list.length && <p className="py-2 text-sm text-muted">{show === 'waiting' ? 'Nobody waiting right now.' : 'No invites sent yet.'}</p>}
      </div>
    </Card>
  );
}
