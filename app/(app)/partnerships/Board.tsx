'use client';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Btn, Pill, cx } from '@/components/ui';
import { flag } from '@/lib/flags';
import { FormModal } from '@/components/FormModal';
import { dealFields } from '@/components/forms';
import { toast } from '@/components/Toaster';
import { createDeal, moveDeal, recordDealPayment } from '@/app/(app)/actions';
import { STAGES, formatCents, shortDate, daysBetween } from '@/lib/finance/core.js';
import { DealDrawer } from './DealDrawer';
import type { Contact, Contract, Deal, Stage, Task } from '@/lib/types';
import { RecordView, type Column } from '@/components/RecordView';
import { STAGE_LABEL } from '@/lib/brand';

export type AgreementLite = { id: string; dealId: string | null; title: string; status: 'draft' | 'sent' | 'signed' | 'void' };
export type InvoiceLite = { id: string; number: string; dealId: string | null; clientName: string; amountCents: number; paidCents: number; state: string; payments: { id: string; date: string; amountCents: number }[] };

export function Board({ deals: initial, invoices, received, summary, initialDeal, readOnly, today, contacts, tasks, contracts = [], agreements = null }: { deals: Deal[]; invoices: InvoiceLite[]; received: Record<string, number>; summary: string; initialDeal: string | null; readOnly: boolean; today: string; contacts: Contact[]; tasks: Task[]; contracts?: Contract[]; agreements?: AgreementLite[] | null }) {
  const router = useRouter();
  const [deals, setDeals] = useState(initial);
  const [sel, setSel] = useState<string | null>(initialDeal);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [, start] = useTransition();
  useEffect(() => setDeals(initial), [initial]);
  useEffect(() => { if (initialDeal) setSel(initialDeal); }, [initialDeal]);

  // When the records can't tell how much was received (estimated or $0 fee), ask once.
  const [askAmount, setAskAmount] = useState<{ id: string; mode: 'move' | 'settle' } | null>(null);
  const move = (id: string, stage: Stage) => {
    if (readOnly) return toast('Demo mode is read-only.');
    const prev = deals;
    setDeals(ds => ds.map(d => (d.id === id ? { ...d, stage } : d)));
    start(async () => {
      const r = await moveDeal({ id, stage });
      if (!r.ok) { setDeals(prev); if (r.error === 'NEEDS_AMOUNT') setAskAmount({ id, mode: 'move' }); else toast(r.error, 'error'); return; }
      toast(r.message ?? 'Stage updated');
      router.refresh();
    });
  };
  const settle = (id: string) => {
    if (readOnly) return toast('Demo mode is read-only.');
    start(async () => {
      const r = await recordDealPayment({ id });
      if (!r.ok) { if (r.error === 'NEEDS_AMOUNT') setAskAmount({ id, mode: 'settle' }); else toast(r.error, 'error'); return; }
      toast(r.message ?? 'Payment recorded');
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
  const contractsOn = flag('contracts');
  // A partnership's contract status: confirmed if any linked contract is confirmed, else "needs review" if one is waiting.
  const contractState = (d: Deal): 'confirmed' | 'review' | null => {
    const mine = contracts.filter(c => c.dealId === d.id);
    return mine.some(c => c.status === 'confirmed') ? 'confirmed' : mine.length ? 'review' : null;
  };
  const contactName = (d: Deal) => (d.contactId && contacts.find(c => c.id === d.contactId)?.name) || d.contactName || '';
  const tableCols: Column<Deal>[] = [
    { key: 'brand', label: 'Brand', sort: d => d.brandName.toLowerCase(), render: d => <span className="flex flex-col"><span className="font-semibold">{d.brandName}</span><span className="text-xs text-muted">{d.campaign || '—'}</span></span> },
    { key: 'stage', label: 'Stage', sort: d => STAGES.findIndex(x => x[0] === d.stage), render: d => <span className="whitespace-nowrap rounded-full bg-[#F0EBF2] px-2 py-0.5 text-[11px] font-medium text-sub">{STAGE_LABEL[d.stage]}</span> },
    { key: 'fee', label: 'Fee', sort: d => d.feeCents, render: d => <span className="tnum whitespace-nowrap">{formatCents(d.feeCents)}{d.feeIsEstimate ? ' est.' : ''}</span> },
    { key: 'received', label: 'Received', sort: d => received[d.id] || 0, render: d => <span className="tnum">{formatCents(received[d.id] || 0)}</span> },
    ...(contractsOn ? [{ key: 'contract', label: 'Contract', hideOnMobile: true, sort: (d: Deal) => ({ confirmed: 2, review: 1 } as Record<string, number>)[contractState(d) ?? ''] ?? 0,
      render: (d: Deal) => { const s = contractState(d); return s === 'confirmed' ? <Pill tone="ok">Confirmed</Pill> : s === 'review' ? <Pill tone="warn">Needs review</Pill> : <span className="text-xs text-muted">—</span>; } } as Column<Deal>] : []),
    { key: 'next', label: 'Next deliverable', hideOnMobile: true, render: d => next(d) ?? <span className="text-xs text-muted">—</span> },
    { key: 'contact', label: 'Contact', hideOnMobile: true, sort: d => contactName(d).toLowerCase(), render: d => contactName(d) || <span className="text-muted">—</span> },
    { key: 'tasks', label: 'Open tasks', hideOnMobile: true, sort: d => tasks.filter(t => t.dealId === d.id && t.status === 'open').length, render: d => <span className="tnum">{tasks.filter(t => t.dealId === d.id && t.status === 'open').length}</span> }
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-sub">{summary}</p>
      <RecordView<Deal> storageKey="partnerships" rows={deals} getId={d => d.id} today={today} noun="partnership" views={['board', 'table']} columns={tableCols}
        onOpen={d => setSel(d.id)} search={d => `${d.brandName} ${d.campaign} ${d.agency} ${d.contactName}`}
        filters={[{ key: 'all', label: 'All', test: d => d.stage !== 'lost' }, { key: 'pipeline', label: 'Pipeline', test: d => ['lead', 'pitching', 'negotiating'].includes(d.stage) },
          { key: 'active', label: 'Active', test: d => ['contracted', 'in_progress'].includes(d.stage) }, { key: 'done', label: 'Completed & paid', test: d => ['completed', 'paid'].includes(d.stage) }, { key: 'lost', label: 'Lost', test: d => d.stage === 'lost' }]}
        toolbar={!readOnly && <div className="flex items-center gap-2">{contractsOn && <Link href="/contracts" className="inline-flex h-9 items-center rounded-[10px] border border-line2 bg-white px-3.5 text-[13px] font-medium">Contracts</Link>}<Link href="/import?kind=deals" className="inline-flex h-9 items-center rounded-[10px] border border-line2 bg-white px-3.5 text-[13px] font-medium">Import CSV</Link><Btn variant="primary" onClick={() => setAdding(true)}>New partnership</Btn></div>}
        empty={<div className="rounded-card border border-dashed border-line2 bg-white p-7 text-sm leading-relaxed text-sub">No partnerships yet? Add your first brand deal and start keeping everything in one place: the fee, payment terms, deliverables and the people involved. It can be an inquiry you just received or one that already paid.{!readOnly && <div className="mt-3 flex flex-wrap items-center gap-3"><Btn variant="primary" onClick={() => setAdding(true)}>Add a partnership</Btn><Link href="/import?kind=deals" className="text-[13px] font-semibold text-ink underline underline-offset-2">or import them from a spreadsheet</Link></div>}</div>}
        renderBoard={shown => (
      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-3 md:-mx-10 md:px-10">
        {STAGES.map(([key, label]) => {
          const list = shown.filter(d => d.stage === key);
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
                  {contractsOn && contractState(d) && <span className={cx('text-[11px]', contractState(d) === 'review' ? 'text-[#8A6418]' : 'text-[#2F7D4F]')}>{contractState(d) === 'review' ? 'Contract needs review' : 'Contract confirmed'}</span>}
                </button>
              ))}
            </section>
          );
        })}
      </div>
        )} />
      <p className="text-xs text-muted">Drag cards between stages on desktop, or open a card to change its stage.</p>
      <FormModal open={adding} onClose={() => setAdding(false)} title="New partnership" fields={dealFields} initial={{ stage: 'lead' }} submitLabel="Add partnership" action={async v => { const r = await createDeal(v); if (r.ok) router.refresh(); return r; }} />
      <DealDrawer deal={selected} allDeals={deals} contacts={contacts} tasks={tasks} contracts={contracts} agreements={agreements} invoices={invoices} received={received} onClose={() => { setSel(null); router.replace('/partnerships', { scroll: false }); }} onMove={move} onSettle={settle} readOnly={readOnly} today={today} />
      {askAmount && <FormModal open onClose={() => setAskAmount(null)} title="How much did you receive?"
        note="This partnership has an estimated or $0 fee, so enter what was actually paid. It’s recorded as a payment and counts as revenue."
        fields={[{ name: 'amount', label: 'Amount received ($)', type: 'money', required: true }, { name: 'receivedOn', label: 'Date received', type: 'date', required: true }]}
        initial={{ receivedOn: today }} submitLabel={askAmount.mode === 'move' ? 'Mark Paid and record' : 'Record payment'}
        action={async v => {
          const r = askAmount.mode === 'move' ? await moveDeal({ id: askAmount.id, stage: 'paid', ...v }) : await recordDealPayment({ id: askAmount.id, ...v });
          if (r.ok) { toast(r.message ?? 'Recorded'); setAskAmount(null); router.refresh(); }
          return r;
        }} />}
    </div>
  );
}
