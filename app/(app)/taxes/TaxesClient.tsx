'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bar, Btn, Card, Eyebrow, Input, Pill, cx } from '@/components/ui';
import { toast } from '@/components/Toaster';
import { saveTaxSettings } from '@/app/(app)/actions';
import { formatCents, shortDate } from '@/lib/finance/core.js';

type Q = { n: number; from: string; to: string; incomeCents: number; expenseCents: number; profitCents: number; setAsideCents: number; dueOn: string | null; status: string; daysUntilDue: number | null };
type T = { year: number; pct: number; incomeCents: number; expenseCents: number; profitCents: number; setAsideCents: number; quarters: Q[]; payers: { name: string; totalCents: number; over1099: boolean }[];
  threshold1099Cents: number; expenseCategories: { category: string; totalCents: number }[]; nextDue: Q | null; hasDates: boolean; entries: number };

const range = (q: Q) => `${shortDate(q.from)} – ${shortDate(q.to)}`;

export function TaxesClient({ t, years, today, readOnly }: { t: T; years: number[]; today: string; readOnly: boolean }) {
  const router = useRouter();
  const [pct, setPct] = useState(String(t.pct));
  const [saving, setSaving] = useState(false);
  const maxCat = Math.max(1, ...t.expenseCategories.map(c => c.totalCents));
  const current = t.year === +today.slice(0, 4);

  async function savePct() {
    if (readOnly) return toast('Demo mode is read-only.');
    setSaving(true); const r = await saveTaxSettings({ pct }); setSaving(false);
    if (!r.ok) return toast(r.error);
    toast('Set-aside updated'); router.refresh();
  }

  const tiles: [string, string, string, string?][] = [
    ['Money received', formatCents(t.incomeCents), 'Payments + direct income'],
    ['Business expenses', formatCents(t.expenseCents), 'What you’ve recorded'],
    ['Estimated profit', formatCents(t.profitCents), 'Received − expenses', t.profitCents < 0 ? 'text-danger' : ''],
    [`Set aside (${t.pct}%)`, formatCents(t.setAsideCents), 'Of profit, at your chosen rate']
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-[10px] bg-lavender p-[3px]" role="tablist" aria-label="Tax year">
          {years.map(y => <button key={y} role="tab" aria-selected={y === t.year} onClick={() => router.push(`/taxes?year=${y}`)} className={cx('h-9 rounded-[8px] px-4 text-sm font-semibold', y === t.year ? 'bg-white shadow-sm' : 'text-sub')}>{y}</button>)}
        </div>
        <a href={`/api/export/tax?year=${t.year}`} className="ml-auto inline-flex h-9 items-center rounded-[10px] border border-line2 bg-white px-3.5 text-[13px] font-medium hover:border-faint">Download {t.year} for your accountant (CSV)</a>
      </div>

      {current && t.nextDue && (
        <div className="flex flex-wrap items-center gap-4 rounded-card bg-plum p-5 text-white">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-mono text-[11px] uppercase tracking-[.08em] text-[#CDB9C9]">Next federal estimated payment</span>
            <span className="text-[26px] font-extrabold leading-tight tracking-[-.03em]">Due {shortDate(t.nextDue.dueOn)}{t.nextDue.daysUntilDue !== null ? ` · in ${t.nextDue.daysUntilDue} days` : ''}</span>
            <span className="text-[14px] text-[#E9DEE7]">Covers money received {range(t.nextDue)}. At {t.pct}%, that period’s set-aside so far is {formatCents(t.nextDue.setAsideCents)}.</span>
          </div>
          <span className="rounded-full bg-chartreuse px-3 py-1.5 font-mono text-[12px] font-semibold text-plum">Q{t.nextDue.n}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(([k, v, s, cls]) => (
          <Card key={k} className="flex flex-col gap-1 p-4">
            <Eyebrow>{k}</Eyebrow>
            <span className={cx('tnum text-[28px] font-extrabold tracking-[-.03em]', cls)}>{v}</span>
            <span className="text-xs text-muted">{s}</span>
          </Card>))}
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="flex flex-col px-5 py-[18px]">
          <div className="mb-2 flex items-baseline justify-between gap-3"><h2 className="font-head text-[24px]">By estimated-tax period</h2><span className="text-xs text-muted">IRS periods, not calendar quarters</span></div>
          <div className="hidden grid-cols-[44px_minmax(0,1.3fr)_repeat(3,minmax(0,1fr))_minmax(0,1.1fr)] gap-3 border-b border-line py-2 font-mono text-[10px] uppercase tracking-[.08em] text-muted md:grid">
            <span>Period</span><span>Dates</span><span>Received</span><span>Profit</span><span>Set aside</span><span>Payment due</span>
          </div>
          {t.quarters.map(q => (
            <div key={q.n} className={cx('grid grid-cols-2 items-center gap-x-3 gap-y-1 border-b border-soft2 py-3 text-sm md:grid-cols-[44px_minmax(0,1.3fr)_repeat(3,minmax(0,1fr))_minmax(0,1.1fr)]', q.status === 'upcoming' && 'text-muted')}>
              <span className="font-mono text-xs font-semibold">Q{q.n}</span>
              <span className="text-xs text-sub md:text-sm">{range(q)}</span>
              <span className="tnum"><span className="text-xs text-muted md:hidden">Received </span>{formatCents(q.incomeCents)}</span>
              <span className={cx('tnum', q.profitCents < 0 && 'text-danger')}><span className="text-xs text-muted md:hidden">Profit </span>{formatCents(q.profitCents)}</span>
              <span className="tnum font-semibold"><span className="text-xs font-normal text-muted md:hidden">Set aside </span>{formatCents(q.setAsideCents)}</span>
              <span className="flex items-center gap-2">{q.dueOn ? <><span className="font-mono text-xs">{shortDate(q.dueOn)}</span>{q.status === 'current' ? <Pill tone="accent">Now</Pill> : q.dueOn < today ? <Pill tone="neutral">Past</Pill> : null}</> : <span className="text-xs text-muted">Check IRS.gov</span>}</span>
            </div>))}
          <p className="mt-3 text-xs leading-relaxed text-muted">Self-employed creators usually pay federal income and self-employment tax four times a year. Due dates shown are federal; your state may have its own. {t.hasDates ? '' : `We don’t have verified dates for ${t.year}.`}</p>
        </Card>

        <div className="flex flex-col gap-3">
          <Card className="flex flex-col gap-3 p-5">
            <Eyebrow>Your set-aside rate</Eyebrow>
            <div className="flex items-center gap-2">
              <div className="w-20 flex-none"><Input value={pct} onChange={e => setPct(e.target.value.replace(/[^\d]/g, '').slice(0, 2))} inputMode="numeric" aria-label="Set-aside percentage" className="text-center text-lg font-bold" disabled={readOnly} /></div>
              <span className="text-lg font-bold">%</span>
              <Btn onClick={savePct} disabled={readOnly || saving || pct === String(t.pct)}>{saving ? 'Saving…' : 'Save'}</Btn>
            </div>
            <p className="text-xs leading-relaxed text-muted">Many self-employed people keep 25–30% of profit aside for taxes, but the right number depends on your income, state and deductions. Ask a tax professional to set yours.</p>
          </Card>
          <Card className="flex flex-col gap-2.5 p-5">
            <Eyebrow>Spending by category · {t.year}</Eyebrow>
            {t.expenseCategories.map(c => <div key={c.category} className="flex flex-col gap-1.5"><div className="flex justify-between text-[13px]"><span>{c.category}</span><span className="tnum">{formatCents(c.totalCents)}</span></div><Bar pct={c.totalCents / maxCat * 100} color="#32152F" /></div>)}
            {!t.expenseCategories.length && <p className="text-sm text-muted">No expenses recorded for {t.year}. Add them under Invoices & Revenue so your profit and set-aside are accurate.</p>}
          </Card>
        </div>
      </div>

      <Card className="flex flex-col px-5 py-[18px]">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3"><h2 className="font-head text-[24px]">Who paid you in {t.year}</h2><span className="text-xs text-muted">Use this to check your 1099s</span></div>
        {t.payers.map(p => (
          <div key={p.name} className="flex items-center justify-between gap-3 border-t border-soft2 py-2.5 text-sm first:border-0">
            <span className="min-w-0 truncate font-medium">{p.name}</span>
            <span className="flex flex-none items-center gap-3">{p.over1099 && <Pill tone="ink">1099 likely</Pill>}<span className="tnum w-24 text-right">{formatCents(p.totalCents)}</span></span>
          </div>))}
        {!t.payers.length && <p className="py-2 text-sm text-muted">No money received in {t.year} yet.</p>}
        <p className="mt-3 text-xs leading-relaxed text-muted">For {t.year}, a business generally sends a 1099-NEC once it pays you {formatCents(t.threshold1099Cents)} or more in the year. Brands that pay through platforms such as PayPal may report on a 1099-K instead, or not at all. Either way, all of it is taxable income.</p>
      </Card>

      <p className="text-xs leading-relaxed text-muted">Cash basis: only money received in {t.year} counts (unpaid invoices don’t), minus the expenses you’ve recorded. Estimates for planning, not tax advice. netbyfriday doesn’t file or pay taxes for you.</p>
    </>
  );
}
