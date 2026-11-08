'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Btn, Card, Field, Select, Textarea, cx } from '@/components/ui';
import { toast } from '@/components/Toaster';

export function GenerateForm({ deals, initialDeal, readOnly }: { deals: { id: string; label: string }[]; initialDeal: string; readOnly: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<'paste' | 'image'>('paste');
  const [text, setText] = useState('');
  const [dealId, setDealId] = useState(initialDeal);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function send(fd: FormData) {
    if (readOnly) return toast('Demo mode is read-only.');
    if (dealId) fd.set('dealId', dealId);
    setBusy(true);
    try {
      const res = await fetch('/api/agreements', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.id) throw new Error(j.error || 'Something went wrong. Nothing was saved.');
      router.push(`/agreements/${j.id}`);
    } catch (e) { toast((e as Error).message, 'error'); setBusy(false); if (input.current) input.current.value = ''; }
  }
  const sendImage = (f?: File) => { if (!f) return; if (f.size > 5 * 1024 * 1024) return toast('Screenshots must be under 5 MB.', 'error'); const fd = new FormData(); fd.set('image', f); send(fd); };

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto font-head text-[26px]">What did you and the brand agree?</h2>
        <div className="flex gap-1 rounded-[10px] bg-bg p-[3px]" role="tablist">
          {(['paste', 'image'] as const).map(m => <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cx('h-[30px] rounded-lg px-3 text-[13px]', mode === m ? 'bg-white font-semibold' : '')}>{m === 'paste' ? 'Paste a message' : 'Upload a screenshot'}</button>)}
        </div>
      </div>
      {deals.length > 0 && (
        <Field label="Partnership (optional)">
          <Select value={dealId} onChange={e => setDealId(e.target.value)} disabled={busy}>
            <option value="">Not linked to a partnership</option>
            {deals.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </Select>
        </Field>)}
      {mode === 'paste' ? (
        <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); const fd = new FormData(); fd.set('text', text); send(fd); }}>
          <Textarea value={text} onChange={e => setText(e.target.value)} rows={9} aria-label="Message text"
            placeholder="Paste the email thread, DM or your notes, e.g. “We’d love 1 Reel and 3 Stories by Dec 5. Budget is $4,200, paid Net 30 after posting…”" />
          <Btn variant="primary" className="w-fit" disabled={busy || !text.trim()}>{busy ? 'Reading the message…' : 'Generate contract'}</Btn>
        </form>
      ) : (
        <button type="button" disabled={busy} onClick={() => input.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); sendImage(e.dataTransfer.files[0]); }}
          className={cx('flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed px-6 py-8 text-center transition', drag ? 'border-ink bg-[#F3FFC4]' : 'border-line2 bg-bg hover:border-faint')}>
          {busy ? <><span className="h-6 w-6 animate-spin rounded-full border-2 border-ink border-t-transparent" aria-hidden /><span className="text-[15px] font-semibold">Reading your screenshot…</span></>
            : <><span className="text-[15px] font-semibold">Drop a screenshot of the email or DM, or choose a file</span><span className="text-[13px] text-muted">PNG, JPG, WEBP or GIF up to 5 MB. It’s read once and not stored.</span></>}
        </button>
      )}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" aria-label="Screenshot" onChange={e => sendImage(e.target.files?.[0])} />
      <p className="text-xs leading-relaxed text-muted">The AI only pulls out the terms you discussed and shows the wording each came from. The contract language is a fixed plain-English template, not written by the AI. It isn’t legal advice; for a large or unusual deal, have a lawyer look it over.</p>
    </Card>
  );
}
