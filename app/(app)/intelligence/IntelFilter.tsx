'use client';
import { useState } from 'react';
import { InsightList } from '@/components/InsightList';
import { cx } from '@/components/ui';
import type { Insight } from '@/lib/types';

const CATS = ['All', 'Revenue', 'Partnership', 'Payment', 'Growth', 'Risk'];

export function IntelFilter(props: { insights: Insight[]; deals: any[]; invoices: any[] }) {
  const [cat, setCat] = useState('All');
  const list = props.insights.filter(i => cat === 'All' || i.category === cat);
  return (
    <>
      <div className="flex flex-wrap gap-1.5">{CATS.map(c => (
        <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)} className={cx('h-8 rounded-full border px-3.5 text-[13px]', cat === c ? 'border-ink bg-ink text-white' : 'border-line2 bg-white')}>{c === 'All' ? `All · ${props.insights.length}` : c}</button>))}</div>
      <div className="flex flex-col gap-3"><InsightList key={cat} {...props} insights={list} variant="full" /></div>
      {!list.length && <p className="text-sm text-muted">No insights in this category. Insights appear only when your records support them.</p>}
    </>
  );
}
