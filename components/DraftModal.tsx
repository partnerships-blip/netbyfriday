'use client';
import { useEffect, useState, useCallback } from 'react';
import { Modal } from './Modal';
import { Btn, Eyebrow, Textarea } from './ui';
import { toast } from './Toaster';

export type DraftTarget = { kind: string; dealId?: string; invoiceId?: string; opportunityId?: string; contactId?: string; label: string; to?: string };

/** AI-written email draft. Always editable; never sent. "Approve" only opens the user's own email app. */
export function DraftModal({ target, onClose }: { target: DraftTarget | null; onClose: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const generate = useCallback(async () => {
    if (!target) return;
    setBusy(true); setText('');
    try {
      const res = await fetch('/api/drafts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: target.kind, dealId: target.dealId, invoiceId: target.invoiceId, opportunityId: target.opportunityId, contactId: target.contactId }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Could not write a draft.');
      setText(j.text);
    } catch (e: any) {
      setText(`Subject: ${target.kind}\n\nHi,\n\n[The AI draft could not be generated: ${e.message}. Write your message here.]\n`);
    } finally { setBusy(false); }
  }, [target]);
  useEffect(() => { if (target) generate(); }, [target, generate]);
  if (!target) return null;
  const m = text.match(/^Subject:\s*(.*)\n+/i);
  const subject = m ? m[1].trim() : target.kind, body = m ? text.slice(m[0].length) : text;
  return (
    <Modal open={!!target} onClose={onClose} wide>
      <div className="flex flex-col gap-3.5">
        <div><Eyebrow>AI draft · {target.label}</Eyebrow><h2 className="mt-1 font-head text-[26px] leading-tight">{target.kind}</h2></div>
        {busy ? <div className="flex h-[240px] items-center justify-center gap-2.5 rounded-xl border border-line text-sm text-muted"><span className="animate-pulse-dot h-2 w-2 rounded-full bg-ac" />Writing from your records</div>
          : <Textarea value={text} onChange={e => setText(e.target.value)} rows={12} className="min-h-[240px]" aria-label="Draft text" />}
        <p className="text-xs leading-relaxed text-muted">Review and edit before using. Anything in [brackets] needs your input. Nothing is sent automatically.</p>
        <div className="flex flex-wrap gap-2">
          <Btn variant="primary" disabled={busy} onClick={() => { window.open(`mailto:${encodeURIComponent(target.to || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank'); onClose(); toast('Opened in your email app. Review and send from there.'); }}>Approve &amp; open in email</Btn>
          <Btn disabled={busy} onClick={() => navigator.clipboard.writeText(text).then(() => toast('Copied'))}>Copy</Btn>
          <Btn disabled={busy} onClick={generate}>Regenerate</Btn>
          <Btn variant="ghost" className="ml-auto" onClick={onClose}>Discard</Btn>
        </div>
      </div>
    </Modal>
  );
}
