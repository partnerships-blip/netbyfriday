'use client';
// Content library: grid or table, search, platform filter, sort. Adding an item opens its page to upload media and metrics.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Btn, Card, Empty, Input, Pill, Select, cx } from '@/components/ui';
import { FormModal } from '@/components/FormModal';
import { shortDate } from '@/lib/finance/core.js';
import { PLATFORM_LABEL, FORMAT_LABEL, PERIOD_LABEL, PLATFORMS } from '@/lib/content/model';
import { contentFields, deriveFromLink } from '@/lib/content/fields';
import type { LibraryRow } from '@/lib/content/server';
import { createContent } from './actions';

const fmt = (n: number | null | undefined) => (n == null ? '—' : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : n.toLocaleString('en-US'));
const SORTS = [['newest', 'Newest first'], ['oldest', 'Oldest first'], ['views', 'Most views'], ['title', 'Title A–Z']] as const;

export function LibraryClient({ rows, today, readOnly, demo }: { rows: LibraryRow[]; today: string; readOnly: boolean; demo: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [q, setQ] = useState(''); const [platform, setPlatform] = useState(''); const [sort, setSort] = useState<typeof SORTS[number][0]>('newest');
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const f = rows.filter(r => (!platform || r.platform === platform) && (!t || [r.title, r.category, r.caption, r.goal].some(x => x.toLowerCase().includes(t))));
    const d = (r: LibraryRow) => r.publishedOn ?? r.createdAt.slice(0, 10);
    return [...f].sort((a, b) => sort === 'oldest' ? d(a).localeCompare(d(b)) : sort === 'views' ? (b.latest?.views ?? -1) - (a.latest?.views ?? -1) : sort === 'title' ? a.title.localeCompare(b.title) : d(b).localeCompare(d(a)));
  }, [rows, q, platform, sort]);

  const add = <FormModal open={adding} onClose={() => setAdding(false)} title="Add content" submitLabel="Add to library" fields={contentFields} derive={deriveFromLink}
    note="Paste the link to keep track of the post. We don’t download anything from Instagram, TikTok or YouTube: to review the video itself, upload the original file on the next screen."
    initial={{ platform: 'instagram', format: 'reel', publishedOn: today, goal: '' }}
    action={async v => { const r = await createContent(v); if (r.ok && r.id) router.push(`/content-intelligence/${r.id}`); return r; }} />;

  if (!rows.length) return (
    <Card className="flex flex-col items-start gap-4 p-6 md:p-8">
      <h2 className="font-head text-[28px] leading-tight">Start with one post you care about.</h2>
      <p className="max-w-[640px] text-[15px] leading-relaxed text-sub">{demo ? 'Content Intelligence works with your own posts, so there’s nothing in the demo. Switch back to your workspace to add one.' : 'Add a Reel, TikTok or YouTube video. Upload the original file for a creative review, add a screenshot of its insights for a performance check-in, and link it to the partnerships it helped you land. No social accounts to connect.'}</p>
      {!readOnly && <Btn variant="primary" onClick={() => setAdding(true)}>Add your first post</Btn>}
      {add}
    </Card>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input aria-label="Search your content" placeholder="Search titles, captions, categories" value={q} onChange={e => setQ(e.target.value)} className="min-w-[200px] flex-1 sm:max-w-[320px]" />
        <div className="w-[150px]"><Select aria-label="Platform" value={platform} onChange={e => setPlatform(e.target.value)}><option value="">All platforms</option>{PLATFORMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div>
        <div className="w-[150px]"><Select aria-label="Sort" value={sort} onChange={e => setSort(e.target.value as any)}>{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div>
        <div className="flex gap-1 rounded-[10px] bg-lavender p-[3px]" role="tablist" aria-label="View">{(['grid', 'table'] as const).map(v => <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cx('h-8 rounded-[8px] px-3 text-[13px] font-semibold capitalize', view === v ? 'bg-white shadow-sm' : 'text-sub')}>{v}</button>)}</div>
        {!readOnly && <Btn variant="primary" className="ml-auto" onClick={() => setAdding(true)}>Add content</Btn>}
      </div>
      {!list.length && <Empty>Nothing matches. Try a different search or platform.</Empty>}
      {view === 'grid' ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">{list.map(r => (
          <Link key={r.id} href={`/content-intelligence/${r.id}`} className="group flex flex-col overflow-hidden rounded-[18px] border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(50,21,47,.1)]">
            <div className="relative aspect-[4/5] bg-soft2">
              {r.thumb ? <img src={r.thumb} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center px-4 text-center text-[13px] text-muted">No preview yet. Upload the original to see it here.</div>}
              <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold">{PLATFORM_LABEL[r.platform]} · {FORMAT_LABEL[r.format]}</span>
            </div>
            <div className="flex flex-col gap-1 p-3.5">
              <span className="line-clamp-2 text-[15px] font-semibold leading-snug">{r.title}</span>
              <span className="text-[12px] text-muted">{r.publishedOn ? shortDate(r.publishedOn) : 'No date'}{r.category ? ` · ${r.category}` : ''}</span>
              <span className="mt-1 flex flex-wrap gap-1.5 text-[12px]">
                {r.latest ? <Pill tone="neutral">{fmt(r.latest.views)} views · {PERIOD_LABEL[r.latest.period]}</Pill> : <Pill tone="neutral">No metrics yet</Pill>}
                {r.analyses > 0 && <Pill tone="ok">{r.analyses} {r.analyses === 1 ? 'analysis' : 'analyses'}</Pill>}
              </span>
            </div>
          </Link>))}
        </div>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <thead className="bg-soft2 font-mono text-[10px] uppercase tracking-[.08em] text-muted"><tr>{['Title', 'Platform', 'Published', 'Category', 'Views', 'Shares', 'Analyses', 'Linked'].map(h => <th key={h} className="px-4 py-2.5">{h}</th>)}</tr></thead>
            <tbody>{list.map(r => (
              <tr key={r.id} className="border-t border-line hover:bg-soft2/50">
                <td className="px-4 py-2.5"><Link href={`/content-intelligence/${r.id}`} className="font-semibold underline-offset-2 hover:underline">{r.title}</Link></td>
                <td className="px-4 py-2.5">{PLATFORM_LABEL[r.platform]} · {FORMAT_LABEL[r.format]}</td>
                <td className="px-4 py-2.5">{r.publishedOn ? shortDate(r.publishedOn) : '—'}</td>
                <td className="px-4 py-2.5">{r.category || '—'}</td>
                <td className="px-4 py-2.5 tnum">{fmt(r.latest?.views)}</td><td className="px-4 py-2.5 tnum">{fmt(r.latest?.shares)}</td>
                <td className="px-4 py-2.5 tnum">{r.analyses}</td><td className="px-4 py-2.5 tnum">{r.links}</td>
              </tr>))}</tbody>
          </table>
        </Card>
      )}
      {add}
    </div>
  );
}
