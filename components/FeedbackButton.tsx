'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Modal } from './Modal';
import { Btn, Field, Select, Textarea } from './ui';
import { useAction } from './Toaster';
import { submitFeedback } from '@/app/(app)/actions';

// openRequest: bump it to open the form from elsewhere (the mobile More menu).
export function FeedbackButton({ openRequest = 0 }: { openRequest?: number }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (openRequest) setOpen(true); }, [openRequest]);
  const [kind, setKind] = useState<'feedback' | 'bug'>('feedback');
  const [message, setMessage] = useState('');
  const [contactOk, setContactOk] = useState(false);
  const [pending, run] = useAction();
  const page = usePathname();
  return (
    <>
      {/* Floating button. On phones the Advisor's ask box is pinned to the bottom of the screen, so the button
          would sit on its text; there it is hidden and feedback is reached from the More menu instead. */}
      <button onClick={() => setOpen(true)} className={`fixed bottom-20 right-4 z-30 h-9 rounded-full border border-line2 bg-white px-4 text-[13px] font-medium shadow-sm hover:border-ink md:bottom-5 ${page.startsWith('/advisor') || /^\/content-intelligence\/[^/]+\/analysis\//.test(page) ? 'hidden md:block' : ''}`}>Feedback</button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-3.5">
          <h2 className="font-head text-[28px]">Send feedback</h2>
          <p className="text-[13px] text-sub">This goes to the beta team. Don't include passwords or bank details.</p>
          <Field label="Type"><Select value={kind} onChange={e => setKind(e.target.value as any)}><option value="feedback">Feedback or idea</option><option value="bug">Something is broken</option></Select></Field>
          <Field label={kind === 'bug' ? 'What happened, and what did you expect?' : 'Your feedback'}><Textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} /></Field>
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={contactOk} onChange={e => setContactOk(e.target.checked)} />The team may email me about this</label>
          <div className="flex gap-2">
            <Btn variant="primary" disabled={pending || !message.trim()} onClick={() => run(() => submitFeedback({ kind, message, page, contactOk }), () => { setOpen(false); setMessage(''); })}>Send</Btn>
            <Btn onClick={() => setOpen(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </>
  );
}
