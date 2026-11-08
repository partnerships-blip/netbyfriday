'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Btn, Card, Eyebrow, Pill, Textarea, cx } from '@/components/ui';
import { RecordView, type Column } from '@/components/RecordView';
import { toast } from '@/components/Toaster';
import { formatCents, shortDate } from '@/lib/finance/core.js';
import type { Contract } from '@/lib/types';

type Row = Contract & { dealLabel: string | null };
type AgreementRow = { id: string; title: string; status: 'draft' | 'sent' | 'signed' | 'void'; brandName: string; updatedAt: string; dealLabel: string | null };
const AGR: Record<AgreementRow['status'], { label: string; tone: 'neutral' | 'warn' | 'ok' }> = { draft: { label: 'Draft', tone: 'neutral' }, sent: { label: 'Waiting for signature', tone: 'warn' }, signed: { label: 'Signed', tone: 'ok' }, void: { label: 'Void', tone: 'neutral' } };
type Window = { contractId: string; title: string; brandName: string; kind: 'usage' | 'exclusivity'; text: string; startsOn: string | null; endsOn: string | null; daysLeft: number | null; state: string };

const STATE: Record<string, { label: (w: Window) => string; tone: 'warn' | 'ok' | 'neutral' | 'accent' }> = {
  ending: { label: w => `Ends in ${w.daysLeft}d`, tone: 'warn' }, active: { label: w => `Until ${shortDate(w.endsOn)}`, tone: 'ok' },
  upcoming: { label: w => `Starts ${shortDate(w.startsOn)}`, tone: 'accent' }, open: { label: () => 'No end date', tone: 'neutral' }, ended: { label: w => `Ended ${shortDate(w.endsOn)}`, tone: 'neutral' }
};

export function ContractsClient({ contracts, windows, today, readOnly, agreementsOn = false, agreements = [] }: { contracts: Row[]; windows: Window[]; today: string; readOnly: boolean; agreementsOn?: boolean; agreements?: AgreementRow[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<'file' | 'paste'>('file');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const review = contracts.filter(c => c.status === 'review');
  const live = windows.filter(w => w.state !== 'ended');

  async function send(fd: FormData) {
    if (readOnly) return toast('Demo mode is read-only.');
    setBusy(true);
    try {
      const res = await fetch('/api/contracts', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.id) throw new Error(j.error || 'Upload failed.');
      router.push(`/contracts/${j.id}`);
    } catch (e) { toast((e as Error).message); setBusy(false); }
  }
  const sendFile = (f: File | undefined) => { if (!f) return; const fd = new FormData(); fd.set('file', f); send(fd); };

  const cols: Column<Row>[] = [
    { key: 'title', label: 'Contract', sort: c => c.title.toLowerCase(), render: c => <span className="flex flex-col"><span className="font-semibold">{c.title}</span><span className="text-xs text-muted">{c.dealLabel ?? 'Not linked to a partnership'}</span></span> },
    { key: 'brand', label: 'Brand', sort: c => c.brandName.toLowerCase(), render: c => c.brandName || <span className="text-muted">—</span> },
    { key: 'fee', label: 'Fee', sort: c => c.feeCents ?? -1, render: c => c.feeCents === null ? <span className="text-muted">—</span> : <span className="tnum">{formatCents(c.feeCents)}</span> },
    { key: 'usage', label: 'Usage ends', hideOnMobile: true, sort: c => c.usageEndsOn, render: c => <span className="font-mono text-xs text-sub">{c.usageEndsOn ? shortDate(c.usageEndsOn) : '—'}</span> },
    { key: 'excl', label: 'Exclusivity ends', hideOnMobile: true, sort: c => c.exclusivityEndsOn, render: c => <span className="font-mono text-xs text-sub">{c.exclusivityEndsOn ? shortDate(c.exclusivityEndsOn) : '—'}</span> },
    { key: 'status', label: 'Status', sort: c => c.status, render: c => c.status === 'review' ? <Pill tone="warn">Needs review</Pill> : <Pill tone="ok">Confirmed</Pill> }
  ];

  return (
    <>
      {agreementsOn && !readOnly && (
        <Card className="flex flex-wrap items-center gap-4 border-ink/15 bg-[#F3FFC4] p-5">
          <span className="flex min-w-0 flex-1 flex-col gap-1"><span className="font-head text-[24px] leading-tight">No contract yet? Generate one.</span>
            <span className="text-[14px] text-sub">Paste the brand’s email or DM, or upload a screenshot. You get a plain-English agreement with your terms, ready to sign and send.</span></span>
          <Link href="/agreements/new" className="inline-flex h-11 items-center rounded-[12px] bg-ink px-5 text-[14px] font-semibold text-white">Generate a contract</Link>
        </Card>
      )}
      {agreementsOn && agreements.length > 0 && (
        <Card className="flex flex-col gap-1 px-5 py-[18px]">
          <div className="mb-1 flex items-baseline justify-between gap-3"><Eyebrow>Agreements you generated</Eyebrow><span className="text-xs text-muted">Signed with netbyfriday</span></div>
          {agreements.map(a => (
            <Link key={a.id} href={`/agreements/${a.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-soft2 py-2.5 text-sm first:border-0 hover:bg-bg">
              <span className="min-w-0"><span className="block truncate font-medium">{a.title}</span><span className="block truncate text-xs text-sub">{[a.brandName, a.dealLabel ?? 'Not linked to a partnership'].filter(Boolean).join(' · ')}</span></span>
              <Pill tone={AGR[a.status].tone}>{AGR[a.status].label}</Pill>
            </Link>))}
        </Card>
      )}
      {!readOnly && (
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="mr-auto font-head text-[26px]">{agreementsOn ? 'Add a contract you received' : 'Add a contract'}</h2>
            <div className="flex gap-1 rounded-[10px] bg-bg p-[3px]" role="tablist">
              {(['file', 'paste'] as const).map(m => <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cx('h-[30px] rounded-lg px-3 text-[13px]', mode === m ? 'bg-white font-semibold' : '')}>{m === 'file' ? 'Upload PDF' : 'Paste text'}</button>)}
            </div>
          </div>
          {mode === 'file' ? (
            <button type="button" disabled={busy} onClick={() => input.current?.click()}
              onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); sendFile(e.dataTransfer.files[0]); }}
              className={cx('flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed px-6 py-8 text-center transition', drag ? 'border-ink bg-[#F3FFC4]' : 'border-line2 bg-bg hover:border-faint')}>
              {busy ? <><span className="h-6 w-6 animate-spin rounded-full border-2 border-ink border-t-transparent" aria-hidden /><span className="text-[15px] font-semibold">Reading your contract…</span><span className="text-[13px] text-muted">This takes up to a minute for long agreements.</span></>
                : <><span className="text-[15px] font-semibold">Drop a contract PDF here, or choose a file</span><span className="text-[13px] text-muted">Up to 10 MB. Stored privately in your workspace. Word file? Save it as PDF first.</span></>}
            </button>
          ) : (
            <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); const fd = new FormData(); fd.set('text', text); send(fd); }}>
              <Textarea value={text} onChange={e => setText(e.target.value)} rows={8} placeholder="Paste the full agreement, or the terms section of a brand email." aria-label="Contract text" />
              <Btn variant="primary" className="w-fit" disabled={busy || !text.trim()}>{busy ? 'Reading…' : 'Read terms'}</Btn>
            </form>
          )}
          <input ref={input} type="file" accept="application/pdf,text/plain" className="hidden" onChange={e => sendFile(e.target.files?.[0])} />
          <p className="text-xs leading-relaxed text-muted">The AI suggests terms and shows the contract wording each one came from. Nothing is added to your partnerships until you confirm. It is not legal advice; for anything unclear, ask the brand or a lawyer.</p>
        </Card>
      )}

      {review.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <Eyebrow>Needs your review</Eyebrow>
          <div className="grid gap-2.5 md:grid-cols-2">
            {review.map(c => (
              <Link key={c.id} href={`/contracts/${c.id}`} className="flex items-center justify-between gap-3 rounded-card border border-[#E8D9A8] bg-[#FBF6E6] p-4 hover:border-[#C9A75A]">
                <span className="flex min-w-0 flex-col"><span className="truncate font-semibold">{c.title}</span><span className="text-xs text-sub">{c.brandName || 'Brand not found yet'} · added {shortDate(c.createdAt.slice(0, 10))}</span></span>
                <span className="flex-none text-[13px] font-semibold underline underline-offset-2">Review terms →</span>
              </Link>))}
          </div>
        </div>
      )}

      {live.length > 0 && (
        <Card className="flex flex-col gap-1 px-5 py-[18px]">
          <div className="mb-1 flex items-baseline justify-between gap-3"><Eyebrow>Rights & restrictions</Eyebrow><span className="text-xs text-muted">From confirmed contracts</span></div>
          {live.map(w => (
            <Link key={w.contractId + w.kind} href={`/contracts/${w.contractId}`} className="grid grid-cols-[110px_minmax(0,1fr)_auto] items-center gap-3 border-t border-soft2 py-2.5 text-sm first:border-0 hover:bg-bg">
              <span className="font-mono text-[11px] uppercase tracking-[.08em] text-muted">{w.kind === 'usage' ? 'Usage rights' : 'Exclusivity'}</span>
              <span className="min-w-0"><span className="font-medium">{w.brandName || w.title}</span><span className="block truncate text-xs text-sub">{w.text}</span></span>
              <Pill tone={STATE[w.state].tone}>{STATE[w.state].label(w)}</Pill>
            </Link>))}
          <p className="mt-2 text-xs leading-relaxed text-muted">When you confirm a contract, netbyfriday adds a task a week before each window ends, so you can offer a usage renewal or start pitching that category again.</p>
        </Card>
      )}

      <RecordView<Row> storageKey="contracts" rows={contracts} getId={c => c.id} today={today} noun="contract" views={['table']} columns={cols}
        onOpen={c => router.push(`/contracts/${c.id}`)} search={c => `${c.title} ${c.brandName} ${c.dealLabel ?? ''}`}
        filters={[{ key: 'all', label: 'All', test: () => true }, { key: 'review', label: 'Needs review', test: c => c.status === 'review' }, { key: 'confirmed', label: 'Confirmed', test: c => c.status === 'confirmed' }]}
        empty={<p className="py-3 text-sm text-muted">No contracts yet. Upload your most recent brand agreement to see what it says about usage, exclusivity and payment.</p>} />
    </>
  );
}
