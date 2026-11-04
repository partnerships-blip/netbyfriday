'use client';
import { useState } from 'react';
import { Card, Eyebrow } from '../ui';
import { formatCents, monthLabel } from '@/lib/finance/core.js';
import { STREAM_COLOR, STREAM_LABEL } from '@/lib/brand';

type Month = { month: string; totalCents: number; byStream: Record<string, number> };

export function RevenueChart({ months }: { months: Month[] }) {
  const [off, setOff] = useState<string[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const keys = Object.keys(STREAM_LABEL), vis = keys.filter(k => !off.includes(k));
  const totals = months.map(m => vis.reduce((a, k) => a + (m.byStream[k] || 0), 0));
  const max = Math.max(250000, Math.ceil(Math.max(...totals) / 250000) * 250000);
  const hi = hover ?? months.length - 1;
  const any = months.some(m => m.totalCents > 0);
  return (
    <Card className="flex min-w-0 flex-col gap-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Eyebrow>Revenue received · 12 months</Eyebrow>
          <div className="text-sm">{monthLabel(months[hi].month, 'long')}{hi === months.length - 1 ? ' (to date)' : ''} · <span className="tnum font-semibold">{formatCents(totals[hi])}</span></div>
        </div>
        <div className="flex flex-wrap gap-2.5 text-xs text-muted">{vis.filter(k => months[hi].byStream[k]).map(k => <span key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: STREAM_COLOR[k] }} />{formatCents(months[hi].byStream[k])}</span>)}</div>
      </div>
      {any ? <>
        <div className="relative flex h-[210px] items-end gap-[3px] pl-[46px] sm:gap-2" onMouseLeave={() => setHover(null)} role="img" aria-label="Monthly revenue chart">
          <div className="absolute left-[46px] right-0 top-0 border-t border-dashed border-line" />
          <div className="absolute left-[46px] right-0 top-[90px] border-t border-dashed border-line" />
          <div className="absolute -top-[7px] left-0 font-mono text-[10px] text-muted">{formatCents(max)}</div>
          <div className="absolute left-0 top-[83px] font-mono text-[10px] text-muted">{formatCents(max / 2)}</div>
          {months.map((m, i) => (
            <button key={m.month} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)} aria-label={`${monthLabel(m.month, 'long')}: ${formatCents(totals[i])}`}
              className="flex h-full min-w-0 flex-1 flex-col gap-1.5 transition-opacity" style={{ opacity: hover === null || hover === i ? 1 : 0.4 }}>
              <div className="flex min-h-0 w-full flex-1 flex-col-reverse gap-0.5">
                {vis.filter(k => m.byStream[k] > 0).map(k => <div key={k} className="rounded-[3px] transition-[height] duration-300" style={{ height: `${(m.byStream[k] / max) * 100}%`, background: STREAM_COLOR[k] }} />)}
              </div>
              <div className="h-3 w-full text-center font-mono text-[10px] text-muted"><span className="sm:hidden">{monthLabel(m.month)[0]}</span><span className="hidden sm:inline">{monthLabel(m.month)}</span></div>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {keys.map(k => { const on = !off.includes(k); return (
            <button key={k} aria-pressed={on} onClick={() => setOff(on ? [...off, k] : off.filter(x => x !== k))} className="flex h-[30px] items-center gap-1.5 rounded-full border border-line px-3 text-xs" style={{ opacity: on ? 1 : 0.45, background: on ? '#fff' : '#FAF7F3' }}>
              <span className="h-2 w-2 rounded-sm" style={{ background: STREAM_COLOR[k] }} />{STREAM_LABEL[k]}</button>); })}
        </div>
      </> : <div className="grid h-[200px] place-items-center rounded-[10px] border border-dashed border-line2 p-5 text-center text-sm text-muted">No money received yet. Record a payment on an invoice, or add income you received, to see your trend.</div>}
    </Card>
  );
}
