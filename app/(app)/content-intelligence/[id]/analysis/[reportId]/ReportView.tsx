'use client';
// One analysis: the content and period on top, metric and comparison cards, the checked report, then the conversation.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Btn, Card, Eyebrow, Pill, cx } from '@/components/ui';
import { toast } from '@/components/Toaster';
import { shortDate } from '@/lib/finance/core.js';
import { PLATFORM_LABEL, FORMAT_LABEL, PERIOD_LABEL, METRICS } from '@/lib/content/model';
import { fmtNum, NOT_ENOUGH } from '@/lib/content/compare';
import type { Asset, ContentItem, Snapshot, ReportRow } from '@/lib/content/server';
import type { Point } from '@/lib/content/report';
import { saveReport, deleteReport } from '../../../actions';
import { Conversation } from './Conversation';

type Msg = { id: string; role: 'user' | 'assistant'; text: string; createdAt: string };
const lowerBetter = new Set(['skipRate']);

function Points({ items }: { items: Point[] }) {
  return <ul className="flex flex-col gap-3.5 pl-5">{items.map((p, i) => (
    <li key={i} className="list-disc text-[16px] leading-[1.65] marker:text-plum">
      {p.lead && <b><i>{p.lead}:</i></b>} {p.point}
      <span className="mt-0.5 block text-[11px] leading-snug text-muted">Based on: {p.citeLabels.join(' · ')}</span>
    </li>))}</ul>;
}
function Section({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  return <details open={open} className="group border-t border-line pt-5 [&_summary::-webkit-details-marker]:hidden">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[19px] font-bold leading-tight">{title}<span aria-hidden className="text-[14px] text-muted transition group-open:rotate-180">⌄</span></summary>
    <div className="mt-3">{children}</div>
  </details>;
}

export function ReportView({ item, assets, snapshots, report: row, messages, readOnly }: { item: ContentItem; assets: Asset[]; snapshots: Snapshot[]; report: ReportRow; messages: Msg[]; readOnly: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(!!row.savedAt);
  const r = row.report;
  const thumb = assets.find(a => a.kind === 'media' && a.mime.startsWith('image/')) ?? assets.find(a => a.kind === 'frame');
  const snap = snapshots.find(s => s.id === row.snapshotId);
  const comp = new Map((r.overview?.comparisons ?? []).map(c => [c.metric, c]));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Top: the content and the period */}
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
        {thumb?.url ? <img src={thumb.url} alt="" className="h-24 w-[68px] flex-none rounded-[10px] object-cover" /> : <div className="grid h-24 w-[68px] flex-none place-items-center rounded-[10px] bg-soft2 text-[11px] text-muted">No preview</div>}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Eyebrow>{PLATFORM_LABEL[item.platform]} · {FORMAT_LABEL[item.format]}{item.publishedOn ? ` · published ${shortDate(item.publishedOn)}` : ''}</Eyebrow>
          <h1 className="font-head text-[clamp(26px,3.6vw,36px)] leading-tight">{r.title}</h1>
          <p className="text-[13px] text-sub">{item.title} · analyzed {new Date(row.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{snap ? ` · numbers for ${snap.period === 'custom' ? snap.periodNote : PERIOD_LABEL[snap.period].toLowerCase()}, checked ${shortDate(snap.measuredOn)}` : ''}</p>
        </div></div>
        {!readOnly && <div className="flex flex-none flex-wrap gap-2">
          <Btn variant={saved ? 'ghost' : 'primary'} onClick={async () => { const x = await saveReport(row.id, !saved); toast(x.ok ? x.message ?? '' : x.error); if (x.ok) setSaved(!saved); }}>{saved ? 'Saved ✓' : 'Save analysis'}</Btn>
          <Btn variant="ghost" onClick={async () => { if (!confirm('Delete this analysis?')) return; const x = await deleteReport(row.id); toast(x.ok ? x.message ?? '' : x.error); if (x.ok) router.push(`/content-intelligence/${item.id}`); }}>Delete</Btn>
        </div>}
      </Card>

      {/* Middle: metrics and comparisons (check-ins only) */}
      {snap && <section aria-label="Key metrics" className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {METRICS.filter(([k]) => (snap as any)[k] != null).map(([k, label]) => { const c = comp.get(k); const good = c && (lowerBetter.has(k) ? c.diffPct < 0 : c.diffPct > 0);
            return (
              <div key={k} className="flex flex-col gap-1 rounded-[14px] border border-line bg-white p-3.5">
                <span className="text-[12px] font-semibold text-muted">{label}</span>
                <span className="font-head text-[26px] leading-none tnum">{fmtNum(k, (snap as any)[k])}</span>
                {c ? <span className={cx('text-[12px] font-semibold', c.direction === 'in line' ? 'text-sub' : good ? 'text-ok' : 'text-danger')}>{c.direction === 'in line' ? 'In line with' : `${Math.abs(c.diffPct)}% ${c.direction}`} your median ({fmtNum(k, c.median)}, {c.n} posts)</span>
                  : <span className="text-[12px] text-faint">No comparison yet</span>}
              </div>); })}
        </div>
        {r.overview && !r.overview.comparisons.length && <p className="rounded-[12px] bg-lavender px-4 py-2.5 text-[13px]">{NOT_ENOUGH} Add the numbers for at least 3 other {FORMAT_LABEL[item.format]}s on {PLATFORM_LABEL[item.platform]} for the same period.</p>}
      </section>}

      {/* Main: the report, written to be read */}
      <article className="flex max-w-[820px] flex-col gap-5 rounded-[20px] border border-line bg-white p-[clamp(20px,4vw,36px)]">
        <h2 className="font-head text-[clamp(24px,3vw,30px)] leading-tight">{r.mode === 'performance' ? (/check-in$/.test(r.title) && !r.title.startsWith('Check-in') ? r.title.replace(/ check-in$/, ' insights').replace(/^./, c => c.toUpperCase()) : `Insights: ${r.overview?.periodLabel ?? ''}`) : r.mode === 'business' ? 'What this post is linked to' : 'Creative review'}</h2>
        {r.summary && <p className="text-[17px] leading-[1.65]">{r.summary}{r.overview?.lines.length ? ' Here’s what stands out:' : ''}</p>}
        {r.overview && r.overview.lines.length > 0 && <ul className="flex flex-col gap-2 pl-5">{r.overview.lines.map((l, i) => <li key={i} className="list-disc text-[16px] leading-relaxed marker:text-plum">{l}</li>)}</ul>}
        {r.overview && r.overview.comparisons.length > 0 && <p className="-mt-2 text-[11px] text-muted">Calculated by NETBYFRIDAY: medians of your other {FORMAT_LABEL[item.format]}s on {PLATFORM_LABEL[item.platform]} over the same period.</p>}
        {r.working.length > 0 && <Section title="What’s working"><Points items={r.working} /></Section>}
        {r.improve.length > 0 && <Section title={r.mode === 'performance' ? 'What needs attention' : 'What could improve'}><Points items={r.improve} /></Section>}
        {r.recommendations.length > 0 && <Section title="Recommendations"><Points items={r.recommendations} /></Section>}
        {r.tests.length > 0 && <Section title="What to test next"><Points items={r.tests} /></Section>}
        {r.next.length > 0 && <Section title="What to create next">
          <div className="grid gap-2.5 sm:grid-cols-2">{r.next.map((n, i) => <div key={i} className="rounded-[12px] bg-soft2 p-4"><div className="text-[15px] font-bold">{n.title}</div><p className="mt-1 text-[14px] leading-relaxed text-sub">{n.point}</p><p className="mt-1 text-[11px] text-muted">Based on: {n.citeLabels.join(' · ')}</p></div>)}</div>
        </Section>}
        {r.business && <Section title="Business opportunity"><Points items={[r.business]} /></Section>}
        <Section title="Data limitations" open={false}>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-relaxed text-sub">{r.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </Section>
      </article>
      <Conversation reportId={row.id} initial={messages} mode={row.mode} format={FORMAT_LABEL[item.format]} readOnly={readOnly} />
    </div>
  );
}
