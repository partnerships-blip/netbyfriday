'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Btn, cx } from '@/components/ui';
import { FormModal } from '@/components/FormModal';
import { dealFields } from '@/components/forms';
import { toast } from '@/components/Toaster';
import { createDeal, moveDeal } from '@/app/(app)/actions';
import { STAGES, formatCents, shortDate, daysBetween } from '@/lib/finance/core.js';
import { DealDrawer } from './DealDrawer';
import type { Deal, Stage } from '@/lib/types';

export type InvoiceLite = { id: string; number: string; dealId: string | null; clientName: string; amountCents: number; paidCents: number; state: string; payments: { id: string; date: string; amountCents: number }[] };

export function Board({ deals: initial, invoices, received, summary, initialDeal, readOnly, today }: { deals: Deal[]; invoices: InvoiceLite[]; received: Record<string, number>; summary: string; initialDeal: string | null; readOnly: boolean; today: string }) {
  const router = useRouter();
  const [deals, setDeals] = useState(initial);
  const [sel, setSel] = useState<string | null>(initialDeal);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [, start] = useTransition();
  useEffect(() => setDeals(initial), [initial]);

  const move = (id: string, stage: Stage) => {
    if (readOnly) return toast('Demo mode is read-only.');
    const prev = deals;
    setDeals(ds => ds.map(d => (d.id === id ? { ...d, stage } : d)));
    start(async () => {
      const r = await moveDeal({ id, stage });
      if (!r.ok) { setDeals(prev); toast(r.error, 'error'); return; }
      toast(stage === 'paid' ? 'Moved to Paid. Revenue counts only recorded payments, so record the payment on its invoice.' : 'Stage updated');
      router.refresh();
    });
  };
  const next = (d: Deal) => {
    const x = d.deliverables.filter(y => !['approved', 'posted'].includes(y.status)).sort((a, b) => (a.dueOn < b.dueOn ? -1 : 1))[0];
    if (!x) return null;
    const n = daysBetween(today, x.dueOn);
    return <span className={cx('text-[11px]', n < 0 ? 'text-danger' : n <= 3 ? 'text-ink' : 'text-muted')}>{n < 0 ? `${-n}d late` : n === 0 ? 'Due today' : `Due ${shortDate(x.dueOn)}`}</span>;
  };
  const selected = deals.find(d => d.id === sel) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="min-w-[200px] flex-1 text-sm text-sub">{summary}</p>
        {!readOnly && <Btn variant="primary" onClick={() => setAdding(true)}>New partnership</Btn>}
      </div>
      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-3 md:-mx-10 md:px-10">
        {STAGES.map(([key, label]) => {
          const list = deals.filter(d => d.stage === key);
          return (
            <section key={key} aria-label={label} onDragOver={e => { e.preventDefault(); if (over !== key) setOver(key); }} onDragLeave={() => setOver(null)}
              onDrop={e => { e.preventDefault(); const id = drag || e.dataTransfer.getData('text/plain'); setDrag(null); setOver(null); if (id) move(id, key as Stage); }}
              className={cx('flex min-h-[420px] w-[264px] flex-none flex-col gap-2 rounded-card border-[1.5px] border-dashed p-2.5 transition-colors', over === key ? 'border-ac bg-ac-soft' : 'border-transparent bg-soft')}>
              <div className="flex items-baseline gap-2 px-1 pb-1.5 pt-1"><span className="text-[13px] font-semibold">{label}</span><span className="font-mono text-[11px] text-muted">{list.length}</span>
                {list.length > 0 && <span className="ml-auto font-mono text-[11px] text-muted">{formatCents(list.reduce((a, d) => a + d.feeCents, 0))}</span>}</div>
              {list.map(d => (
                <button key={d.id} draggable={!readOnly} onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', d.id); setDrag(d.id); }} onDragEnd={() => { setDrag(null); setOver(null); }}
                  onClick={() => setSel(d.id)} className={cx('flex flex-col gap-1.5 rounded-[10px] border border-line bg-white p-3 text-left transition hover:shadow-md', drag === d.id && 'opacity-40', !readOnly && 'cursor-grab')}>
                  <span className="text-sm font-semibold">{d.brandName}</span>
                  <span className="text-[13px] leading-snug text-sub">{d.campaign || '—'}</span>
                  <span className="mt-0.5 flex items-baseline justify-between gap-2"><span className="font-mono text-xs">{formatCents(d.feeCents)}{d.feeIsEstimate ? ' est.' : ''}</span>{next(d)}</span>
                </button>
              ))}
            </section>
          );
        })}
      </div>
      <p className="text-xs text-muted">Drag cards between stages on desktop, or open a card to change its stage.</p>
      <FormModal open={adding} onClose={() => setAdding(false)} title="New partnership" fields={dealFields} initial={{ stage: 'lead' }} submitLabel="Add partnership" action={async v => { const r = await createDeal(v); if (r.ok) router.refresh(); return r; }} />
      <DealDrawer deal={selected} allDeals={deals} invoices={invoices} received={received} onClose={() => { setSel(null); router.replace('/partnerships', { scroll: false }); }} onMove={move} readOnly={readOnly} today={today} />
    </div>
  );
}
