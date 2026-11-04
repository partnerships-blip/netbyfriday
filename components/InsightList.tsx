'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Btn, Pill, EVIDENCE, cx } from './ui';
import { DraftModal, type DraftTarget } from './DraftModal';
import type { Insight } from '@/lib/types';

/** Renders insights from the deterministic engine. compact = expandable rows (Overview); full = cards with score breakdown (Intelligence). */
export function InsightList({ insights, variant, deals, invoices, showScores = true }: {
  insights: Insight[]; variant: 'compact' | 'full'; deals: { id: string; email: string; brand: string }[]; invoices: { id: string; client: string; number: string }[]; showScores?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(insights[0]?.id ?? null);
  const [draft, setDraft] = useState<DraftTarget | null>(null);
  const startDraft = (i: Insight) => {
    const d = deals.find(x => x.id === i.dealId), v = invoices.find(x => x.id === i.invoiceId);
    setDraft({ kind: i.draftKind!, dealId: i.dealId, invoiceId: i.invoiceId, label: d?.brand ?? v?.client ?? '', to: d?.email });
  };
  const Body = ({ i }: { i: Insight }) => (
    <div className="animate-in flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-sub">{i.explain}</p>
      <div className="flex flex-col gap-1.5 rounded-[10px] bg-bg px-3.5 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[.08em] text-muted">{variant === 'full' ? 'Supporting data' : 'Why this appeared'}</div>
        {i.data.map((t, k) => <div key={k} className="tnum text-[13px]">{t}</div>)}
      </div>
      <p className="text-sm leading-relaxed"><span className="font-semibold">Recommended: </span>{i.action}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={i.target} className="inline-flex h-[34px] items-center rounded-[9px] border border-line2 bg-white px-3.5 text-[13px]">{i.actionLabel}</Link>
        {i.draftKind && <Btn variant="accent" onClick={() => startDraft(i)}>Draft with AI</Btn>}
        {variant === 'full' && i.related.length > 0 && <span className="text-xs text-muted">Related: {i.related.map(r => r.label).join(', ')}</span>}
      </div>
    </div>
  );
  return (
    <>
      {variant === 'compact' ? insights.map(i => (
        <div key={i.id} className="flex flex-col gap-2.5 border-t border-soft py-3.5">
          <button onClick={() => setOpen(open === i.id ? null : i.id)} aria-expanded={open === i.id} className="flex w-full items-start gap-3 text-left">
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] uppercase tracking-[.08em] text-muted">{i.category}</span><Pill tone={EVIDENCE[i.evidence].tone}>{EVIDENCE[i.evidence].label}</Pill></span>
              <span className="text-base font-medium leading-snug">{i.title}</span>
            </span>
            <span className="w-5 text-center font-mono text-base text-muted">{open === i.id ? '−' : '+'}</span>
          </button>
          {open === i.id && <Body i={i} />}
        </div>
      )) : insights.map((i, idx) => (
        <div key={i.id} className={cx('animate-in grid gap-5 rounded-card border border-line bg-white p-5', showScores && 'md:grid-cols-[minmax(0,1fr)_200px]')}>
          <div className="flex min-w-0 flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs">#{idx + 1}</span><span className="font-mono text-[10px] uppercase tracking-[.08em] text-muted">{i.category}</span><Pill tone={EVIDENCE[i.evidence].tone}>{EVIDENCE[i.evidence].label}</Pill></div>
            <h3 className="font-head text-[26px] leading-tight text-pretty">{i.title}</h3>
            <Body i={i} />
          </div>
          {showScores && <div className="flex flex-col gap-2.5 md:border-l md:border-soft md:pl-5">
            <div className="flex items-baseline gap-1.5"><span className="font-head text-[40px] leading-none">{i.score}</span><span className="text-xs text-muted">/ 100</span></div>
            {([['Impact', i.scores.impact, 40], ['Urgency', i.scores.urgency, 30], ['Confidence', i.scores.confidence, 20], ['Goal relevance', i.scores.goal, 10]] as const).map(([k, v, max]) => (
              <div key={k} className="flex flex-col gap-1"><div className="flex justify-between text-xs text-sub"><span>{k}</span><span className="font-mono">{v}/{max}</span></div>
                <div className="h-1 rounded bg-soft"><div className="h-full rounded bg-ink" style={{ width: `${(v / max) * 100}%` }} /></div></div>))}
          </div>}
        </div>
      ))}
      <DraftModal target={draft} onClose={() => setDraft(null)} />
    </>
  );
}
