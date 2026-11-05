'use client';
// "Send" an invoice from the workspace. netbyfriday doesn't send email: it makes a private invoice link and opens the
// creator's own email app with the message filled in. The invoice is marked sent when they do.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from './Modal';
import { Btn, Field, Input, Textarea } from './ui';
import { toast } from './Toaster';
import { shareInvoice, markInvoiceSent, stopSharingInvoice, saveInvoiceSettings } from '@/app/(app)/actions';
import { formatCentsExact, shortDate } from '@/lib/finance/core.js';

export type SendTarget = { id: string; number: string; clientName: string; description: string; balanceCents: number; dueOn: string; terms: string; to: string; contactName: string; sentAt: string | null; hasLink: boolean; overdue: boolean };

export function SendInvoiceModal({ target, onClose, fromName, settings, readOnly }: {
  target: SendTarget | null; onClose: () => void; fromName: string; settings: { paymentDetails: string; email: string }; readOnly: boolean;
}) {
  const router = useRouter();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [details, setDetails] = useState(settings.paymentDetails);
  const [replyTo, setReplyTo] = useState(settings.email);
  const [editDetails, setEditDetails] = useState(false);

  useEffect(() => {
    if (!target) return;
    setTo(target.to); setErr(null); setLink(null); setEditDetails(!settings.paymentDetails);
    setDetails(settings.paymentDetails); setReplyTo(settings.email);
    setSubject(`Invoice ${target.number} from ${fromName}`);
    if (readOnly) { setErr('Demo mode is read-only. In your workspace, this creates a private invoice link and opens your email app.'); return; }
    shareInvoice({ id: target.id, billToEmail: target.to }).then(r => {
      if (!r.ok || !r.id) return setErr(r.ok ? 'Could not create the link.' : r.error);
      setLink(`${window.location.origin}/i/${r.id}`);
    });
  }, [target?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!target) return;
    const first = target.contactName.split(' ')[0] || 'there';
    const amount = formatCentsExact(target.balanceCents), due = `${shortDate(target.dueOn)} (${target.terms})`;
    setBody(`Hi ${first},\n\n${target.overdue ? `A quick follow-up on invoice ${target.number}${target.description ? ` for ${target.description}` : ''}. The balance of ${amount} was due ${due}.` : `Here’s invoice ${target.number}${target.description ? ` for ${target.description}` : ''}. The balance of ${amount} is due ${due}.`}\n\nYou can view and download it here:\n${link ?? '[link]'}\n\nThank you!\n${fromName}`);
  }, [target, link, fromName]);

  if (!target) return null;
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const copy = async (s: string, what: string) => { try { await navigator.clipboard.writeText(s); toast(`${what} copied`); } catch { toast('Copy failed. Select the text and copy it.'); } };

  return (
    <Modal open onClose={onClose}>
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1">
          <h2 className="font-head text-[28px] leading-tight">Send {target.number}</h2>
          <p className="text-[13px] text-sub">{target.clientName} · {formatCentsExact(target.balanceCents)} due {shortDate(target.dueOn)}{target.sentAt ? ` · last sent ${shortDate(target.sentAt.slice(0, 10))}` : ''}</p>
        </div>
        {err ? <p className="rounded-[10px] bg-bg p-3 text-[13px] text-sub">{err}</p> : <>
          <div className="flex flex-col gap-1.5 rounded-[12px] border border-line bg-bg p-3">
            <span className="font-mono text-[10px] uppercase tracking-[.08em] text-muted">Private invoice link</span>
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{link ?? 'Creating link…'}</span>
              {link && <><a href={link} target="_blank" rel="noopener" className="text-[12px] font-semibold underline underline-offset-2">Preview</a><Btn size="sm" onClick={() => copy(link, 'Link')}>Copy</Btn></>}
            </div>
            <span className="text-[11px] text-muted">Anyone with this link can view and download this one invoice. You can turn it off any time.</span>
          </div>
          <Field label="To"><Input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="brand@example.com" /></Field>
          <Field label="Subject"><Input value={subject} onChange={e => setSubject(e.target.value)} /></Field>
          <Field label="Message"><Textarea value={body} onChange={e => setBody(e.target.value)} rows={9} /></Field>

          <div className="flex flex-col gap-2 rounded-[12px] border border-line p-3">
            <button type="button" onClick={() => setEditDetails(x => !x)} className="flex items-center justify-between text-left text-[13px] font-semibold">
              <span>How brands pay you {settings.paymentDetails ? '' : <span className="font-normal text-danger">· not set yet</span>}</span><span aria-hidden>{editDetails ? '−' : '+'}</span>
            </button>
            {editDetails && <>
              <Textarea value={details} onChange={e => setDetails(e.target.value)} rows={3} placeholder="e.g. Bank transfer (ACH) or PayPal. Details sent on request." aria-label="Payment details" />
              <Input type="email" value={replyTo} onChange={e => setReplyTo(e.target.value)} placeholder="Your email for invoice questions" aria-label="Invoice email" />
              <p className="text-[11px] leading-relaxed text-muted">Shown on every invoice link. Avoid full account numbers here; share those directly if you prefer.</p>
              <Btn size="sm" className="w-fit" onClick={async () => { const r = await saveInvoiceSettings({ paymentDetails: details, email: replyTo }); if (!r.ok) return toast(r.error); toast('Invoice details saved'); router.refresh(); }}>Save details</Btn>
            </>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a href={link ? mailto : undefined} aria-disabled={!link}
              onClick={async e => { if (!link) { e.preventDefault(); return; } const r = await markInvoiceSent(target.id); if (r.ok) { toast('Marked as sent'); router.refresh(); } }}
              className={`inline-flex h-10 items-center rounded-[10px] px-4 text-sm font-semibold ${link ? 'bg-ink text-white hover:bg-[#4A2A45]' : 'pointer-events-none bg-soft2 text-muted'}`}>Open in my email</a>
            <Btn disabled={!link} onClick={async () => { await copy(`${subject}\n\n${body}`, 'Message'); const r = await markInvoiceSent(target.id); if (r.ok) { toast('Copied and marked as sent'); router.refresh(); } }}>Copy message</Btn>
            {target.hasLink && <button className="ml-auto text-[12px] text-muted underline underline-offset-2 hover:text-danger" onClick={async () => { const r = await stopSharingInvoice(target.id); if (!r.ok) return toast(r.error); toast('Link turned off'); router.refresh(); onClose(); }}>Turn off link</button>}
          </div>
          <p className="text-[11px] leading-relaxed text-muted">netbyfriday doesn’t send email for you. “Open in my email” starts a message in your own mail app; it’s marked as sent here when you use it.</p>
        </>}
      </div>
    </Modal>
  );
}
