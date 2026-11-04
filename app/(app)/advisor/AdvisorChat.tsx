'use client';
import { useRef, useState } from 'react';
import { Btn, Card, Pill } from '@/components/ui';
import { clearAdvisor } from '@/app/(app)/actions';
import type { AdvisorReply } from '@/lib/ai/advisor';

type Msg = { id: string; role: 'user' | 'assistant'; content: string; reply: AdvisorReply | null };
const PROMPTS = ['How much money did I make last month?', 'Which brands have paid me the most?', 'What invoices are overdue?', 'What should I prioritize this week?', 'Which past brands should I pitch again?', 'Am I on track to reach my revenue goal?', 'What should I consider charging for this campaign?', 'Where am I leaving money on the table?'];

function Reply({ r }: { r: AdvisorReply }) {
  const Section = ({ title, tone, children }: { title: string; tone?: string; children: React.ReactNode }) => <div className="flex flex-col gap-1.5"><div className={`mt-1.5 font-mono text-[10px] uppercase tracking-[.08em] ${tone ?? 'text-muted'}`}>{title}</div>{children}</div>;
  return (
    <Card className="animate-in flex flex-col gap-2 px-5 py-[18px]">
      <p className="text-[15px] leading-relaxed">{r.answer}</p>
      {r.unverifiedAnswerAmounts.length > 0 && <p className="text-xs text-danger">Check before relying on: {r.unverifiedAnswerAmounts.join(', ')} could not be matched to your records.</p>}
      {r.facts.length > 0 && <Section title="From your records">{r.facts.map((f, i) => (
        <div key={i} className="flex flex-col gap-1 text-sm leading-relaxed">
          <div className="tnum flex gap-2.5"><span className="text-faint">—</span><span className={f.verified ? '' : 'text-sub line-through decoration-faint'}>{f.statement}</span></div>
          <div className="ml-5 flex flex-wrap items-center gap-1.5">
            {f.verified ? <Pill tone="ok">Verified</Pill> : <Pill tone="danger">Not verified: {f.reason}</Pill>}
            {f.evidenceLabels.map((l, k) => <span key={k} className="rounded border border-line px-1.5 py-px font-mono text-[10px] text-muted">{l}</span>)}
            {f.calculation && <span className="font-mono text-[11px] text-sub">{f.calculation}</span>}
          </div>
        </div>))}</Section>}
      {r.forecasts.length > 0 && <Section title="Forecast · not guaranteed" tone="text-[#7A4E0E]">{r.forecasts.map((f, i) => <div key={i} className="text-sm leading-relaxed"><span className="text-faint">— </span>{f.statement}{f.assumptions && <span className="text-xs text-muted"> Assumes: {f.assumptions}</span>}</div>)}</Section>}
      {r.recommendations.length > 0 && <Section title="Suggestion" tone="text-ac-text">{r.recommendations.map((f, i) => <div key={i} className="text-sm leading-relaxed"><span className="text-faint">— </span>{f.statement}</div>)}</Section>}
      {r.missing.length > 0 && <Section title="Would help to know">{r.missing.map((f, i) => <div key={i} className="text-sm text-sub"><span className="text-faint">— </span>{f}</div>)}</Section>}
    </Card>
  );
}

export function AdvisorChat({ sources, initial, demo }: { sources: string; initial: Msg[]; demo: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const ask = async (q: string) => {
    q = q.trim(); if (!q || busy) return;
    setMsgs(m => [...m, { id: 'u' + Date.now(), role: 'user', content: q, reply: null }]); setInput(''); setBusy(true);
    try {
      const res = await fetch('/api/advisor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: q }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'The Advisor is unavailable.');
      setMsgs(m => [...m, { id: 'a' + Date.now(), role: 'assistant', content: j.reply.answer, reply: j.reply }]);
    } catch (e: any) {
      setMsgs(m => [...m, { id: 'e' + Date.now(), role: 'assistant', content: '', reply: { answer: e.message, facts: [], forecasts: [], recommendations: [], missing: [], unverifiedAnswerAmounts: [] } }]);
    } finally { setBusy(false); setTimeout(() => endRef.current?.parentElement?.parentElement?.scrollTo?.({ top: 1e9, behavior: 'smooth' }), 50); }
  };
  return (
    <div className="flex w-full max-w-[820px] flex-col gap-[18px]">
      <div className="font-mono text-[11px] leading-relaxed text-muted">Reading: {sources}</div>
      {!msgs.length && <div className="grid gap-2 sm:grid-cols-2">{PROMPTS.map(p => <button key={p} onClick={() => ask(p)} className="min-h-[54px] rounded-xl border border-line bg-white px-3.5 py-3 text-left text-sm leading-snug hover:border-[#9A8396]">{p}</button>)}</div>}
      {msgs.map(m => m.role === 'user'
        ? <div key={m.id} className="ml-auto w-fit max-w-[80%] rounded-[14px_14px_4px_14px] bg-ink px-4 py-3 text-[15px] leading-relaxed text-bg">{m.content}</div>
        : m.reply ? <Reply key={m.id} r={m.reply} /> : <Card key={m.id} className="px-5 py-4 text-[15px]">{m.content}</Card>)}
      {busy && <div className="flex items-center gap-2.5 text-sm text-muted"><span className="animate-pulse-dot h-2 w-2 rounded-full bg-ac" />Reading your records</div>}
      <div ref={endRef} />
      <form className="sticky bottom-0 flex flex-col gap-1.5 bg-bg pb-1 pt-2.5" onSubmit={e => { e.preventDefault(); ask(input); }}>
        <div className="flex items-center gap-2 rounded-[14px] border border-line2 bg-white py-1.5 pl-4 pr-1.5">
          <input value={input} onChange={e => setInput(e.target.value)} maxLength={1000} aria-label="Ask the Advisor" placeholder="Ask about your money, partners or priorities" className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
          <Btn variant="accent" disabled={busy || !input.trim()} className="h-10 px-[18px] text-sm">Ask</Btn>
        </div>
        <p className="text-xs text-muted">Uses only your records. Not legal or tax advice. Drafts are never sent without your approval.
          {msgs.length > 0 && <> <button type="button" className="underline" onClick={async () => { if (!demo) await clearAdvisor(); setMsgs([]); }}>Clear conversation</button></>}</p>
      </form>
    </div>
  );
}
