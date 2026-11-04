'use client';
import { useState } from 'react';
import Link from 'next/link';
import { AppIcon } from '../Brand';
type Sample = { q: string; answer: string; facts: string[]; next: string[] };
/** Pre-written sample answers computed from the fictional demo records. No AI call happens on the public site. */
export function AdvisorDemo({ samples }: { samples: Sample[] }) {
  const [i, setI] = useState<number | null>(null);
  const cur = i === null ? null : samples[i];
  return (
    <div className="grid gap-5 min-[860px]:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="flex flex-col gap-2.5">{samples.map((s, k) => <button key={s.q} onClick={() => setI(k)} aria-pressed={i === k}
        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-4 text-left text-[16px] font-bold transition ${i === k ? 'border-plum bg-white' : 'border-white bg-[rgba(255,255,255,.6)] hover:bg-white'}`}>{s.q}<span aria-hidden>→</span></button>)}</div>
      <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(50,21,47,.14)]">
        <div className="flex items-center gap-2.5 bg-plum px-5 py-3.5 text-bg"><AppIcon size={26} inverted /><span className="flex-1"><span className="block text-sm font-extrabold">AI Advisor</span><span className="block text-xs text-[#CDB9C9]">Sample answer · fictional creator records</span></span><span className="rounded-full bg-chartreuse px-2 py-0.5 text-[11px] font-extrabold text-plum">Demo</span></div>
        <div className="min-h-[300px] p-6">
          {!cur ? <div><div className="text-lg font-extrabold">Pick a question</div><p className="mt-1 text-[15px] leading-relaxed text-muted">These answers come from a sample creator&apos;s deals, invoices and tasks, calculated the same way the product does it.</p></div> : <div className="flex flex-col gap-3">
            <div className="ml-auto w-fit max-w-[85%] rounded-[14px_14px_4px_14px] bg-plum px-4 py-2.5 text-[15px] text-bg">{cur.q}</div>
            <p className="text-[16px] font-semibold leading-relaxed">{cur.answer}</p>
            <div><div className="text-xs font-extrabold uppercase tracking-[.15em] text-muted">From the records</div><ul className="mt-1.5 flex flex-col gap-1">{cur.facts.map(f => <li key={f} className="flex gap-2 text-[14px]"><span className="text-faint">—</span><span>{f}</span><span className="ml-auto h-fit whitespace-nowrap rounded-full bg-[#E3EEE5] px-1.5 text-[10px] font-bold text-ok">Verified</span></li>)}</ul></div>
            <div><div className="text-xs font-extrabold uppercase tracking-[.15em] text-ac-text">Suggested next step</div><ul className="mt-1.5 flex flex-col gap-1">{cur.next.map(f => <li key={f} className="text-[14px]"><span className="text-faint">— </span>{f}</li>)}</ul></div>
            <div className="mt-1 grid gap-2 sm:grid-cols-2"><Link href="/waitlist" className="rounded-xl border border-line p-3 text-sm"><span className="block font-bold">Join the waitlist</span><span className="text-xs text-muted">Ask about your own records</span></Link>
              <div className="rounded-xl border border-line p-3 text-sm"><span className="block font-bold">Draft a follow-up</span><span className="text-xs text-muted">Editable, never sent for you</span></div></div>
          </div>}
        </div>
      </div>
    </div>
  );
}
