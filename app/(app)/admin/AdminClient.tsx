'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Btn, Card, Eyebrow, Field, Input, Pill } from '@/components/ui';
import { useAction } from '@/components/Toaster';
import { createInvite, setFeedbackStatus } from './admin-actions';

export function AdminClient({ feedback, invites }: { feedback: any[]; invites: any[] }) {
  const router = useRouter();
  const [pending, run] = useAction();
  const [inv, setInv] = useState({ code: '', maxUses: '1', expiresAt: '', note: '' });
  return (
    <div className="grid items-start gap-3 lg:grid-cols-2">
      <Card className="flex flex-col gap-3 p-5">
        <Eyebrow>Invite codes</Eyebrow>
        <form className="grid gap-2 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); run(() => createInvite(inv), () => { setInv({ code: '', maxUses: '1', expiresAt: '', note: '' }); router.refresh(); }); }}>
          <Field label="Code"><Input value={inv.code} onChange={e => setInv({ ...inv, code: e.target.value.toUpperCase() })} placeholder="NOOR-2026" className="font-mono" /></Field>
          <Field label="Max uses"><Input inputMode="numeric" value={inv.maxUses} onChange={e => setInv({ ...inv, maxUses: e.target.value })} /></Field>
          <Field label="Expires (optional)"><Input type="date" value={inv.expiresAt} onChange={e => setInv({ ...inv, expiresAt: e.target.value })} /></Field>
          <Field label="Note"><Input value={inv.note} onChange={e => setInv({ ...inv, note: e.target.value })} placeholder="Who it's for" /></Field>
          <Btn variant="primary" disabled={pending} className="w-fit">Create code</Btn>
        </form>
        <div className="flex flex-col">{invites.map(i => <div key={i.code} className="flex items-center justify-between gap-2 border-t border-soft2 py-2 text-sm"><span className="font-mono">{i.code}</span><span className="text-xs text-muted">{i.note}</span><span className="text-xs">{i.uses}/{i.max_uses}{i.expires_at ? ` · until ${i.expires_at.slice(0, 10)}` : ''}</span></div>)}</div>
      </Card>
      <Card className="flex flex-col gap-3 p-5">
        <Eyebrow>Feedback and bug reports</Eyebrow>
        {feedback.map(f => (
          <div key={f.id} className="flex flex-col gap-1.5 border-t border-soft2 pt-2.5">
            <div className="flex flex-wrap items-center gap-2"><Pill tone={f.kind === 'bug' ? 'danger' : 'accent'}>{f.kind}</Pill><span className="font-mono text-[11px] text-muted">{f.page} · {f.created_at.slice(0, 10)}</span><Pill>{f.status}</Pill></div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{f.message}</p>
            <div className="flex items-center gap-2 text-xs text-muted">{f.contact_email ? <a href={`mailto:${f.contact_email}`} className="underline">{f.contact_email}</a> : 'Contact not permitted'}
              {f.status !== 'resolved' && <Btn size="sm" className="ml-auto" onClick={() => run(() => setFeedbackStatus(f.id, f.status === 'new' ? 'triaged' : 'resolved'), () => router.refresh())}>{f.status === 'new' ? 'Mark triaged' : 'Resolve'}</Btn>}</div>
          </div>
        ))}
        {!feedback.length && <p className="text-sm text-muted">No feedback yet.</p>}
      </Card>
    </div>
  );
}
