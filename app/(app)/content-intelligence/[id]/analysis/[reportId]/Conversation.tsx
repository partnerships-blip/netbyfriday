'use client';
// Follow-up conversation under an analysis. Answers are checked against the analysis sources; ideas can be saved as
// content ideas or tasks, only when the creator clicks. Nothing is sent or published.
import { useEffect, useRef, useState } from 'react';
import { Btn, Textarea, cx } from '@/components/ui';
import { toast } from '@/components/Toaster';
import type { FollowUp } from '@/lib/content/followup';
import { askAboutReport, saveIdea, saveIdeaAsTask } from '../../../actions';

type Msg = { id: string; role: 'user' | 'assistant'; text: string };
const parse = (t: string): FollowUp => { try { return JSON.parse(t); } catch { return { answer: t, points: [], ideas: [], removed: 0 }; } };

export function Conversation({ reportId, initial, mode, format, readOnly }: { reportId: string; initial: Msg[]; mode: string; format: string; readOnly: boolean }) {
  const [msgs, setMsgs] = useState(initial);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Record<string, 'idea' | 'task'>>({});
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (msgs.length > initial.length) end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs.length, initial.length]);
  const suggestions = mode === 'performance'
    ? ['Why do you think people skipped this?', 'Give me three stronger hooks', `Compare this with my last five ${format}s`, 'Should I make another one like this?']
    : ['Rewrite the first three seconds', 'Give me three stronger hooks', 'How could I pitch this to a brand?', 'Turn these insights into a content plan'];

  async function ask(text: string) {
    const question = text.trim(); if (!question || busy) return;
    setBusy(true); setQ('');
    setMsgs(m => [...m, { id: 'u' + Date.now(), role: 'user', text: question }]);
    const r = await askAboutReport({ reportId, question });
    setBusy(false);
    if (!r.ok) { toast(r.error); setMsgs(m => m.slice(0, -1)); setQ(question); return; }
    setMsgs(m => [...m, { id: 'a' + Date.now(), role: 'assistant', text: JSON.stringify(r.reply) }]);
  }
  const keep = async (text: string, as: 'idea' | 'task') => {
    const r = await (as === 'idea' ? saveIdea : saveIdeaAsTask)({ reportId, text });
    toast(r.ok ? r.message ?? 'Saved' : r.error);
    if (r.ok) setSaved(s => ({ ...s, [text]: as }));
  };

  return (
    <section aria-label="Conversation about this analysis" className="flex max-w-[820px] flex-col gap-3">
      {msgs.map(m => m.role === 'user'
        ? <div key={m.id} className="ml-auto max-w-[85%] rounded-[16px] rounded-br-[4px] bg-plum px-4 py-2.5 text-[15px] text-bg">{m.text}</div>
        : (() => { const f = parse(m.text); return (
          <div key={m.id} className="flex flex-col gap-3 rounded-[16px] border border-line bg-white p-5">
            {f.answer && <p className="whitespace-pre-line text-[16px] leading-[1.65]">{f.answer}</p>}
            {f.points.length > 0 && <ul className="flex flex-col gap-2.5 pl-5">{f.points.map((p, i) => <li key={i} className="list-disc text-[15px] leading-relaxed marker:text-plum">{p.lead && <b><i>{p.lead}:</i></b>} {p.point}<span className="block text-[11px] text-muted">Based on: {p.citeLabels.join(' · ')}</span></li>)}</ul>}
            {f.ideas.length > 0 && <ol className="flex flex-col gap-2">{f.ideas.map((t, i) => (
              <li key={i} className="flex flex-col gap-2 rounded-[12px] bg-soft2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <span className="text-[15px] leading-relaxed">{t}</span>
                {!readOnly && <span className="flex flex-none gap-1.5">{saved[t] ? <span className="text-[12px] font-semibold text-ok">{saved[t] === 'idea' ? 'Saved as idea' : 'Added to tasks'}</span> : <>
                  <button className="h-8 rounded-[8px] border border-line2 bg-white px-2.5 text-[12px] font-semibold" onClick={() => keep(t, 'idea')}>Save as idea</button>
                  <button className="h-8 rounded-[8px] border border-line2 bg-white px-2.5 text-[12px] font-semibold" onClick={() => keep(t, 'task')}>Save as task</button></>}</span>}
              </li>))}</ol>}
            {f.removed > 0 && <p className="text-[11px] text-muted">{f.removed} {f.removed === 1 ? 'part was' : 'parts were'} left out because {f.removed === 1 ? 'it' : 'they'} couldn’t be checked against your content and records.</p>}
          </div>); })())}
      {busy && <div role="status" className="flex items-center gap-2 text-[14px] text-sub"><span className="h-4 w-4 animate-spin rounded-full border-2 border-plum border-t-transparent" aria-hidden />Thinking it through…</div>}
      <div ref={end} />
      {!readOnly && <div className="sticky bottom-3 z-10 flex flex-col gap-2 rounded-[18px] border border-line bg-white/95 p-3 shadow-[0_12px_40px_rgba(50,21,47,.12)] backdrop-blur">
        {msgs.length === 0 && <div className="flex flex-wrap gap-1.5">{suggestions.map(s => <button key={s} disabled={busy} onClick={() => ask(s)} className="rounded-full bg-lavender px-3 py-1.5 text-[13px] font-semibold">{s}</button>)}</div>}
        <form className="flex items-end gap-2" onSubmit={e => { e.preventDefault(); ask(q); }}>
          <Textarea aria-label="Ask about this analysis" placeholder="Ask about this analysis…" value={q} onChange={e => setQ(e.target.value)} rows={1}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(q); } }} className={cx('min-h-[44px] flex-1 resize-none')} />
          <Btn type="submit" variant="primary" disabled={busy || !q.trim()} aria-label="Send question">Ask</Btn>
        </form>
        <p className="text-[11px] text-muted">Answers use this analysis, its sources and your other {format}s. Nothing is sent or published.</p>
      </div>}
    </section>
  );
}
