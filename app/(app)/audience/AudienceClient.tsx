'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Btn, Card, Eyebrow, Bar, Empty, Field, Input } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { FormModal } from '@/components/FormModal';
import { useAction } from '@/components/Toaster';
import { saveSnapshots, saveCategory } from '@/app/(app)/actions';
import { formatCents, shortDate } from '@/lib/finance/core.js';
import type { AudienceSnapshot, ContentCategory } from '@/lib/types';

const k = (n: number | null | undefined) => n == null ? '—' : n >= 1000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + 'k' : String(n);

export function AudienceClient({ series, categories, revByCat, note, readOnly, today }: { series: { platform: string; points: AudienceSnapshot[] }[]; categories: ContentCategory[]; revByCat: Record<string, number>; note: string; readOnly: boolean; today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState(false);
  const [rows, setRows] = useState<Record<string, { followers: string; engagementRate: string; avgViews: string }>>({});
  const [pending, run] = useAction();
  const latestDate = series.flatMap(s => s.points.map(p => p.capturedOn)).sort().pop();
  const openEditor = () => { setRows(Object.fromEntries(series.map(s => { const l = s.points[s.points.length - 1]; return [s.platform, { followers: l ? String(l.followers) : '', engagementRate: l?.engagementRate != null ? String(l.engagementRate) : '', avgViews: l?.avgViews != null ? String(l.avgViews) : '' }]; }))); setOpen(true); };
  const mv = Math.max(1, ...categories.map(c => c.avgViews)), mr = Math.max(1, ...Object.values(revByCat));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="min-w-[200px] flex-1 text-[13px] text-sub">{latestDate ? `Manual entry · last updated ${shortDate(latestDate)}` : 'No metrics entered yet'}. Direct connections to Instagram, TikTok and YouTube will use each platform's official API once approved.</p>
        {!readOnly && <Btn variant="primary" onClick={openEditor} disabled={!series.length}>Update metrics</Btn>}
      </div>
      {series.length ? <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
        {series.map(s => {
          const l = s.points[s.points.length - 1], f = s.points[0];
          const lo = Math.min(...s.points.map(p => p.followers)), hi = Math.max(...s.points.map(p => p.followers));
          return (
            <Card key={s.platform} className="flex flex-col gap-3 p-[18px]">
              <div className="flex items-center justify-between"><span className="text-sm font-semibold">{s.platform}</span><span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">Manual</span></div>
              <div className="flex items-baseline gap-2"><span className="font-head text-[38px] leading-none">{k(l?.followers)}</span><span className="text-[13px] text-muted">followers</span></div>
              <div className="flex h-11 items-end gap-[3px]">{s.points.length > 1 ? s.points.map((p, i) => <div key={p.id} className="flex-1 rounded-sm" style={{ height: `${hi > lo ? ((p.followers - lo) / (hi - lo)) * 80 + 20 : 50}%`, background: i === s.points.length - 1 ? 'var(--ac)' : '#E0D5DE' }} />) : <span className="text-xs text-muted">The trend appears after two or more updates.</span>}</div>
              <div className="grid grid-cols-3 gap-2 border-t border-soft pt-2.5 text-sm font-medium">
                <div><div className="text-[11px] font-normal text-muted">Growth</div>{f && l && f !== l && f.followers ? `${l.followers >= f.followers ? '+' : ''}${Math.round((l.followers - f.followers) / f.followers * 100)}%` : '—'}</div>
                <div><div className="text-[11px] font-normal text-muted">Engagement</div>{l?.engagementRate != null ? l.engagementRate + '%' : '—'}</div>
                <div><div className="text-[11px] font-normal text-muted">Avg views</div>{k(l?.avgViews)}</div>
              </div>
            </Card>
          );
        })}
      </div> : <Empty>No platforms yet. Add your platforms in Settings, then enter follower counts from each app's insights page.</Empty>}

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Card className="flex min-w-0 flex-col gap-3.5 px-5 py-[18px]">
          <div className="flex flex-wrap items-baseline justify-between gap-2.5"><Eyebrow>Content categories · views vs. revenue received</Eyebrow>{!readOnly && <Btn variant="ghost" onClick={() => setCat(true)}>Add category</Btn>}</div>
          {categories.map(c => (
            <div key={c.id} className="flex flex-col gap-1.5 border-b border-soft2 pb-2.5">
              <div className="flex justify-between gap-2.5 text-sm"><span className="font-medium">{c.name}</span><span className="tnum text-xs text-muted">{k(c.avgViews)} avg views · {formatCents(revByCat[c.name] || 0)}</span></div>
              <Bar pct={c.avgViews / mv * 100} color="#CDB9C9" h={5} /><Bar pct={(revByCat[c.name] || 0) / mr * 100} h={5} />
            </div>
          ))}
          {!categories.length && <p className="text-sm text-muted">Add categories and tag partnerships with them to compare reach with revenue.</p>}
          <p className="text-[13px] leading-relaxed text-sub">{note}</p>
        </Card>
        <Card className="flex flex-col gap-2.5 px-5 py-[18px]">
          <Eyebrow>Demographics</Eyebrow>
          <div className="stripes grid h-[120px] place-items-center rounded-[10px] p-3 text-center font-mono text-[11px] text-muted">insufficient data</div>
          <p className="text-[13px] leading-relaxed text-sub">Age, location and gender breakdowns need a connected account or an insights export. Nothing is estimated.</p>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-3.5">
          <h2 className="font-head text-[28px]">Update metrics</h2>
          <p className="text-[13px] text-sub">Copy the numbers from each platform's insights page. Saved as a snapshot for {shortDate(today)}.</p>
          {series.map(s => (
            <div key={s.platform} className="grid grid-cols-3 gap-2">
              <Field label={`${s.platform} followers`}><Input inputMode="numeric" value={rows[s.platform]?.followers ?? ''} onChange={e => setRows(r => ({ ...r, [s.platform]: { ...r[s.platform], followers: e.target.value } }))} /></Field>
              <Field label="Engagement %"><Input inputMode="decimal" value={rows[s.platform]?.engagementRate ?? ''} onChange={e => setRows(r => ({ ...r, [s.platform]: { ...r[s.platform], engagementRate: e.target.value } }))} /></Field>
              <Field label="Avg views"><Input inputMode="numeric" value={rows[s.platform]?.avgViews ?? ''} onChange={e => setRows(r => ({ ...r, [s.platform]: { ...r[s.platform], avgViews: e.target.value } }))} /></Field>
            </div>
          ))}
          <div className="flex gap-2">
            <Btn variant="primary" disabled={pending} onClick={() => run(() => saveSnapshots(Object.entries(rows).filter(([, v]) => v.followers.trim()).map(([platform, v]) => ({ platform, followers: v.followers.replace(/,/g, ''), engagementRate: v.engagementRate, avgViews: v.avgViews.replace(/,/g, ''), capturedOn: today }))), () => { setOpen(false); router.refresh(); })}>Save</Btn>
            <Btn onClick={() => setOpen(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
      <FormModal open={cat} onClose={() => setCat(false)} title="Content category" note="Use the same name as the content category on your partnerships." fields={[{ name: 'name', label: 'Name', required: true }, { name: 'avgViews', label: 'Average views', type: 'number', required: true }, { name: 'posts', label: 'Posts', type: 'number' }]} submitLabel="Save" action={async v => { const r = await saveCategory(v); if (r.ok) router.refresh(); return r; }} />
    </div>
  );
}
