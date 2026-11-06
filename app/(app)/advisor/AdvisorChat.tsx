'use client';
import { useRef, useState } from 'react';
import { Btn, Card, Pill, cx } from '@/components/ui';
import { clearAdvisor, createTask, updateDeliverable } from '@/app/(app)/actions';
import type { AdvisorReply, AdvisorAction } from '@/lib/ai/advisor';
import { DraftModal, type DraftTarget } from '@/components/DraftModal';
import { useAction, toast } from '@/components/Toaster';
import { useRouter } from 'next/navigation';
import { DELIVERABLE_LABEL } from '@/lib/brand';
import { shortDate } from '@/lib/finance/core.js';

type Msg = { id: string; role: 'user' | 'assistant'; content: string; reply: AdvisorReply | null; live?: boolean };
const EMPTY = { facts: [], forecasts: [], recommendations: [], missing: [], unverifiedAnswerAmounts: [], drafts: [], actions: [] };
const PROMPTS = ["What's on my plate this week?", 'Who should I follow up with?', 'What invoices are overdue?', 'How much money did I make last month?', 'Which brands have paid me the most?', 'Am I on track to reach my revenue goal?', 'Draft a reminder for my oldest unpaid invoice', 'Which past brands should I pitch again?'];

function Reply({ r, live, demo, onDraft }: { r: AdvisorReply; live: boolean; demo: boolean; onDraft: (t: DraftTarget) => void }) {
  const Section = ({ title, tone, children }: { title: string; tone?: string; children: React.ReactNode }) => <div className="flex flex-col gap-1.5"><div className={`mt-1.5 font-mono text-[10px] uppercase tracking-[.08em] ${tone ?? 'text-muted'}`}>{title}</div>{children}</div>;
  return (
    <Card className="animate-in flex flex-col gap-2 px-5 py-[18px]">
      <p className="text-[15px] leading-relaxed">{r.answer}</p>
      {r.unverifiedAnswerAmounts.length > 0 && <p className="text-xs text-danger">Check before relying on: {r.unverifiedAnswerAmounts.join(', ')} could not be matched to your records.</p>}
      {r.facts.length > 0 && <Section title="From your records">{r.facts.map((f, i) => (
        <div key={i} className="flex flex-col gap-1 text-sm leading-relaxed">
          <div className="tnum flex gap-2.5"><span className="text-faint">—</span><span className={f.verified ? '' : 'text-sub line-through decoration-faint'}>{f.statement}</span></div>
          <div className="ml-5 flex flex-wrap items-center gap-1.5">
            {f.verified ? <Pill tone="ok">Matches your records</Pill> : <Pill tone="danger">Doesn’t match your records: {f.reason}</Pill>}
            {f.evidenceLabels.map((l, k) => <span key={k} className="rounded border border-line px-1.5 py-px font-mono text-[10px] text-muted">{l}</span>)}
            {f.calculation && <span className="font-mono text-[11px] text-sub">{f.calculation}</span>}
          </div>
        </div>))}</Section>}
      {r.forecasts.length > 0 && <Section title="Forecast · not guaranteed" tone="text-[#7A4E0E]">{r.forecasts.map((f, i) => <div key={i} className="text-sm leading-relaxed"><span className="text-faint">— </span>{f.statement}{f.assumptions && <span className="text-xs text-muted"> Assumes: {f.assumptions}</span>}</div>)}</Section>}
      {r.recommendations.length > 0 && <Section title="Suggestion" tone="text-ac-text">{r.recommendations.map((f, i) => <div key={i} className="text-sm leading-relaxed"><span className="text-faint">— </span>{f.statement}</div>)}</Section>}
      {r.missing.length > 0 && <Section title="Would help to know">{r.missing.map((f, i) => <div key={i} className="text-sm text-sub"><span className="text-faint">— </span>{f}</div>)}</Section>}
      {(r.drafts ?? []).length > 0 && <Section title="Drafts">{r.drafts.map((d, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2.5 rounded-xl border border-line px-3 py-2.5">
          <span className="min-w-0 flex-1 text-sm"><span className="font-semibold">{d.kind}</span> · {d.label}{d.why && <span className="block text-xs text-muted">{d.why}</span>}</span>
          <Btn size="sm" variant="accent" onClick={() => onDraft({ kind: d.kind, dealId: d.dealId, invoiceId: d.invoiceId, contactId: d.contactId, label: d.label })}>Write draft</Btn>
        </div>))}<p className="text-xs text-muted">Drafts open for you to edit, copy or send from your own email. Nothing is sent from netbyfriday.</p></Section>}
      {(r.actions ?? []).length > 0 && <Section title="Suggested changes">{r.actions.map((a, i) => <ActionCard key={i} a={a} live={live} demo={demo} />)}</Section>}
    </Card>
  );
}

function ActionCard({ a, live, demo }: { a: AdvisorAction; live: boolean; demo: boolean }) {
  const router = useRouter();
  const [pending, run] = useAction();
  const [state, setState] = useState<'idle' | 'done' | 'dismissed'>('idle');
  const text = a.type === 'create_task'
    ? <>Add task <span className="font-semibold">“{a.title}”</span>{a.due ? ` due ${shortDate(a.due)}` : ''}{a.labels.length ? <span className="text-muted"> · {a.labels.join(' · ')}</span> : null}</>
    : <>Mark <span className="font-semibold">{a.label}</span> as <span className="font-semibold">{DELIVERABLE_LABEL[a.status]}</span></>;
  const confirm = () => run(() => a.type === 'create_task'
    ? createTask({ title: a.title, dueOn: a.due ?? '', dealId: a.dealId ?? '', contactId: a.contactId ?? '', invoiceId: a.invoiceId ?? '' })
    : updateDeliverable({ id: a.deliverableId, status: a.status }), () => { setState('done'); router.refresh(); });
  return (
    <div className={cx('flex flex-wrap items-center gap-2.5 rounded-xl border px-3 py-2.5', state === 'done' ? 'border-[#CFE3D3] bg-[#F4FAF5]' : 'border-line')}>
      <span className={cx('min-w-0 flex-1 text-sm leading-snug', state === 'dismissed' && 'text-faint line-through')}>{text}</span>
      {state === 'done' ? <Pill tone="ok">Done</Pill> : state === 'dismissed' ? null : !live ? <span className="text-xs text-muted">Suggested earlier</span> : demo ? <span className="text-xs text-muted">Not available in the demo</span> : <>
        <Btn size="sm" variant="primary" disabled={pending} onClick={confirm}>Confirm</Btn>
        <Btn size="sm" disabled={pending} onClick={() => setState('dismissed')}>Dismiss</Btn></>}
    </div>
  );
}

export function AdvisorChat({ sources, initial, demo, emails = {} }: { sources: string; initial: Msg[]; demo: boolean; emails?: Record<string, string> }) {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<DraftTarget | null>(null);
  const ask = async (q: string) => {
    q = q.trim(); if (!q || busy) return;
    setMsgs(m => [...m, { id: 'u' + Date.now(), role: 'user', content: q, reply: null }]); setInput(''); setBusy(true);
    try {
      const res = await fetch('/api/advisor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: q }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'The Advisor is unavailable.');
      setMsgs(m => [...m, { id: 'a' + Date.now(), role: 'assistant', content: j.reply.answer, reply: j.reply, live: true }]);
    } catch (e: any) {
      setMsgs(m => [...m, { id: 'e' + Date.now(), role: 'assistant', content: '', reply: { answer: e.message, ...EMPTY } }]);
    } finally { setBusy(false); setTimeout(() => endRef.current?.parentElement?.parentElement?.scrollTo?.({ top: 1e9, behavior: 'smooth' }), 50); }
  };
  return (
    <div className="flex w-full max-w-[820px] flex-col gap-[18px]">
      <div className="font-mono text-[11px] leading-relaxed text-muted">Reading: {sources}</div>
      {!msgs.length && <div className="grid gap-2 sm:grid-cols-2">{PROMPTS.map(p => <button key={p} onClick={() => ask(p)} className="min-h-[54px] rounded-xl border border-line bg-white px-3.5 py-3 text-left text-sm leading-snug hover:border-[#9A8396]">{p}</button>)}</div>}
      {msgs.map(m => m.role === 'user'
        ? <div key={m.id} className="ml-auto w-fit max-w-[80%] rounded-[14px_14px_4px_14px] bg-ink px-4 py-3 text-[15px] leading-relaxed text-bg">{m.content}</div>
        : m.reply ? <Reply key={m.id} r={{ ...EMPTY, ...m.reply }} live={!!m.live} demo={demo} onDraft={t => setDraft({ ...t, to: emails[t.contactId ? 'contact:' + t.contactId : t.dealId ? 'deal:' + t.dealId : 'invoice:' + t.invoiceId] })} /> : <Card key={m.id} className="px-5 py-4 text-[15px]">{m.content}</Card>)}
      {busy && <div className="flex items-center gap-2.5 text-sm text-muted"><span className="animate-pulse-dot h-2 w-2 rounded-full bg-ac" />Reading your records</div>}
      <div ref={endRef} />
      <form className="sticky bottom-0 flex flex-col gap-1.5 bg-bg pb-1 pt-2.5" onSubmit={e => { e.preventDefault(); ask(input); }}>
        <div className="flex items-center gap-2 rounded-[14px] border border-line2 bg-white py-1.5 pl-4 pr-1.5">
          <input value={input} onChange={e => setInput(e.target.value)} maxLength={1000} aria-label="Ask the Advisor" placeholder="Ask about your money, partners or priorities" className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
          <Btn variant="accent" disabled={busy || !input.trim()} className="h-10 px-[18px] text-sm">Ask</Btn>
        </div>
        <p className="text-xs text-muted">Uses only your records. Not legal or tax advice. Nothing is sent or changed unless you confirm it.
          {msgs.length > 0 && <> <button type="button" className="underline" onClick={async () => { if (!demo) await clearAdvisor(); setMsgs([]); }}>Clear conversation</button></>}</p>
      </form>
      <DraftModal target={draft} onClose={() => setDraft(null)} />
    </div>
  );
}
