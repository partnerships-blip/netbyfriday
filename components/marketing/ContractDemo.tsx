'use client';
// Homepage demo of uploading a contract. Scripted from the sample creator's records (no AI call on the public site):
// the contract is "read", each term appears with the sentence it came from, and hovering a term lights up its source.
import { useEffect, useRef, useState } from 'react';

type Clause = { key: string; text: string };
type Term = { key: string; label: string; value: string };
type Phase = 'idle' | 'dropping' | 'reading' | 'done';

export function ContractDemo({ file, title, clauses, terms, reminder }: { file: string; title: string; clauses: Clause[]; terms: Term[]; reminder: string }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [shown, setShown] = useState(0);
  const [focus, setFocus] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const reduce = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const play = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    setFocus(null); setShown(0);
    if (reduce()) { setPhase('done'); setShown(terms.length); return; }
    setPhase('dropping');
    timers.current.push(window.setTimeout(() => setPhase('reading'), 700));
    timers.current.push(window.setTimeout(() => setPhase('done'), 2000));
    terms.forEach((t, i) => timers.current.push(window.setTimeout(() => { setShown(i + 1); setFocus(t.key); }, 2150 + i * 420)));
    timers.current.push(window.setTimeout(() => setFocus(null), 2150 + terms.length * 420 + 900));
  };

  // Plays once when the demo scrolls into view.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { play(); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); timers.current.forEach(clearTimeout); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const read = phase === 'done';
  return (
    <div ref={root} className="grid grid-cols-1 items-start gap-5 min-[960px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* The contract */}
      <div className="relative rounded-[24px] border border-line bg-white p-[clamp(20px,3vw,34px)] shadow-[0_24px_60px_rgba(50,21,47,.08)]">
        <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-8 flex-none place-items-center rounded-[6px] bg-[#F3DDD6] font-mono text-[10px] font-semibold text-danger">PDF</span>
            <span className="min-w-0 truncate text-[14px] font-semibold">{file}</span>
          </span>
          <span className="flex-none rounded-full bg-[#F0EBF2] px-2.5 py-1 text-[11px] font-bold">Sample contract</span>
        </div>
        <div className="mt-5 font-[Georgia,serif] text-[15px] leading-[1.7] text-[#3B2A38]">
          <div className="mb-3 font-sans text-[13px] font-extrabold uppercase tracking-[.08em]">{title}</div>
          {clauses.map(c => (
            <p key={c.key} className={`mb-2.5 rounded-[6px] px-1.5 py-0.5 transition-colors duration-300 ${read && focus === c.key ? 'bg-chartreuse' : read && terms.slice(0, shown).some(t => t.key === c.key) ? 'bg-[#F7FBE6]' : ''}`}>{c.text}</p>
          ))}
        </div>
      </div>

      {/* netbyfriday reading it */}
      <div className="flex flex-col gap-3 rounded-[24px] bg-plum p-[clamp(20px,3vw,30px)] text-bg">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[.14em] text-[#CDB9C9]">netbyfriday · contracts</span>
          <button onClick={play} className="rounded-full border border-[#CDB9C9]/50 px-3 py-1 text-[12px] font-semibold hover:bg-white/10">{phase === 'idle' ? 'Play demo' : 'Replay'}</button>
        </div>

        {!read ? (
          <div className={`flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-[18px] border-2 border-dashed px-6 text-center transition ${phase === 'dropping' ? 'border-chartreuse bg-white/5' : 'border-[#CDB9C9]/40'}`}>
            {phase === 'reading'
              ? <><span className="h-7 w-7 animate-spin rounded-full border-2 border-chartreuse border-t-transparent" aria-hidden /><span className="text-[17px] font-bold">Reading your contract…</span><span className="text-[13px] text-[#CDB9C9]">Fee, payment terms, usage rights, exclusivity, deliverables</span></>
              : <><span className={`rounded-[10px] bg-white px-3 py-2 text-[13px] font-semibold text-plum shadow-lg transition duration-500 ${phase === 'dropping' ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>{file}</span><span className="text-[17px] font-bold">Drop a contract PDF here</span><span className="text-[13px] text-[#CDB9C9]">or paste the terms from an email</span></>}
          </div>
        ) : (
          <div className="flex flex-col gap-2" role="list" aria-label="Terms found in the contract">
            {terms.map((t, i) => (
              <button key={t.key} role="listitem" onMouseEnter={() => setFocus(t.key)} onMouseLeave={() => setFocus(null)} onFocus={() => setFocus(t.key)} onBlur={() => setFocus(null)}
                className={`grid grid-cols-[110px_minmax(0,1fr)] items-baseline gap-3 rounded-[12px] px-3.5 py-2.5 text-left transition duration-300 ${i < shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'} ${focus === t.key ? 'bg-chartreuse text-plum' : 'bg-white/[.06]'}`}>
                <span className={`font-mono text-[10px] uppercase tracking-[.12em] ${focus === t.key ? 'text-plum' : 'text-[#CDB9C9]'}`}>{t.label}</span>
                <span className="text-[14px] font-semibold leading-snug">{t.value}</span>
              </button>))}
            <div className={`mt-1 rounded-[12px] border border-chartreuse/60 px-3.5 py-2.5 text-[13px] leading-snug text-[#F3FFC4] transition duration-500 ${shown >= terms.length ? 'opacity-100' : 'opacity-0'}`}>{reminder}</div>
            <div className={`mt-1 flex flex-wrap items-center gap-2 transition duration-500 ${shown >= terms.length ? 'opacity-100' : 'opacity-0'}`}>
              <span className="rounded-[10px] bg-chartreuse px-4 py-2 text-[13px] font-bold text-plum">Confirm contract</span>
              <span className="text-[12px] text-[#CDB9C9]">You check every term first. Nothing is saved until you confirm.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
