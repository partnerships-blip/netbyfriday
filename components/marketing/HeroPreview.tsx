'use client';
import { useState } from 'react';
import { AppIcon } from '../Brand';

const STAGE_BG: Record<string, string> = { in_progress: '#DFFF43', paid: '#E3EEE5', lead: '#EAE5F7', pitching: '#EAE5F7', negotiating: '#EAE5F7' };
const EV_BG: Record<string, string> = { Verified: '#E3EEE5', Estimate: '#F5ECD8', Suggestion: '#F3FFC4' };
export function HeroPreview({ s }: { s: any }) {
  const [tab, setTab] = useState<'home' | 'deals' | 'money' | 'insights'>('home');
  const max = Math.max(1, ...s.months.slice(5, 11).map((x: any) => x.cents));
  return (
    <div className="relative">
      <div className="absolute inset-4 -z-10 hidden rotate-[-4deg] rounded-[40px] bg-plum min-[860px]:block" />
      <div className="overflow-hidden rounded-[22px] border border-line bg-white shadow-[0_30px_80px_rgba(50,21,47,.22)] transition duration-500 min-[860px]:[transform:perspective(1800px)_rotateY(-9deg)_rotateX(3deg)] min-[860px]:hover:[transform:none]">
        <div className="flex">
          <div className="hidden w-[148px] flex-none flex-col gap-1 border-r border-line bg-bg p-3 sm:flex">
            <div className="mb-2 flex items-center gap-2"><AppIcon size={20} /><span className="text-[13px] font-extrabold tracking-tight">netbyfriday</span></div>
            {(['home', 'deals', 'money', 'insights'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`h-8 rounded-lg px-2.5 text-left text-[13px] capitalize ${tab === t ? 'bg-chartreuse font-extrabold' : 'font-semibold text-sub'}`}>{t}</button>)}
          </div>
          <div className="min-w-0 flex-1 p-4">
            <div className="flex items-start justify-between gap-2"><div><div className="text-[17px] font-extrabold tracking-tight">Good afternoon, {s.firstName}</div><div className="text-xs text-muted">Here&apos;s what&apos;s happening with your business.</div></div>
              <span className="whitespace-nowrap rounded-full bg-lavender px-2 py-0.5 text-[10px] font-bold">Sample data</span></div>
            <div className="mt-2 flex gap-1 sm:hidden">{(['home', 'deals', 'money', 'insights'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`h-7 rounded-lg px-2 text-xs capitalize ${tab === t ? 'bg-chartreuse font-extrabold' : 'text-sub'}`}>{t}</button>)}</div>
            {tab === 'home' && <div className="mt-3 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">{s.stats.map((x: any) => <div key={x.label} className="rounded-xl border border-line p-2.5"><div className="text-[10px] text-muted">{x.label}</div><div className="text-xl font-extrabold tracking-tight">{x.value}</div><span className="rounded-full bg-lavender px-1.5 text-[9px] font-bold">{x.pill}</span></div>)}</div>
              <div><div className="mb-1 text-[11px] font-bold">Deal pipeline</div><div className="flex flex-wrap gap-1">{s.pipeline.map((p: any) => <span key={p.label} className="rounded-full bg-[#F3EEF4] px-2 py-0.5 text-[10px] font-semibold">{p.label} · {p.n}</span>)}</div></div>
              <div className="grid grid-cols-[1.2fr_1fr] gap-2">
                <div className="rounded-xl border border-line p-2.5"><div className="mb-1 text-[11px] font-bold">Upcoming payments</div>{s.payments.map((p: any) => <div key={p.client} className="flex items-center justify-between gap-1 py-0.5 text-[11px]"><span className="truncate">{p.client}</span><span className="flex items-center gap-1 font-bold">{p.amount}<span className="whitespace-nowrap rounded px-1 text-[9px]" style={{ background: p.late ? '#F3DDD6' : '#F5ECD8' }}>{p.terms}</span></span></div>)}</div>
                <div className="flex flex-col rounded-xl border border-line p-2.5"><div className="text-[11px] font-bold">Cash flow</div><div className="mt-1 flex flex-1 items-end gap-1">{s.months.slice(5, 11).map((x: any, i: number) => <div key={x.label} className="flex-1 rounded-t" style={{ height: Math.max(8, x.cents / max * 100) + '%', minHeight: 6, background: i === 5 ? '#DFFF43' : i >= 3 ? '#C6EE2E' : '#ECF8B5' }} />)}</div></div>
              </div></div>}
            {tab === 'deals' && <div className="mt-3 flex flex-col">{s.deals.map((x: any) => <div key={x.campaign} className="flex items-center justify-between gap-2 border-b border-soft2 py-2 text-xs"><span className="min-w-0"><span className="block font-bold">{x.brand}</span><span className="block truncate text-muted">{x.campaign}</span></span><span className="flex items-center gap-1.5 whitespace-nowrap font-bold">{x.fee}<span className="rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: STAGE_BG[x.key] ?? '#F3EEF4' }}>{x.stage}</span></span></div>)}</div>}
            {tab === 'money' && <div className="mt-3"><div className="text-3xl font-extrabold tracking-tight">{s.outstanding}</div><div className="text-xs text-muted">outstanding · {s.overdue} overdue</div>
              <div className="mt-3 flex flex-col">{s.terms.map((t: any) => <div key={t.terms} className="flex items-center gap-2 border-b border-soft2 py-2 text-xs"><span className="w-16 rounded-full bg-[#F3FFC4] px-2 py-0.5 text-center text-[10px] font-extrabold">{t.terms}</span><span className="flex-1">{t.open}</span><span className="text-muted">{t.avg}</span></div>)}</div></div>}
            {tab === 'insights' && <div className="mt-3 flex flex-col gap-2">{s.insights.slice(0, 3).map((x: any) => <div key={x.title} className="rounded-xl border border-line p-2.5"><span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: EV_BG[x.evidence] ?? '#EFE9F1' }}>{x.evidence}</span><div className="mt-1 text-[13px] font-bold leading-snug">{x.title}</div></div>)}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
