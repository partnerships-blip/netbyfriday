import { notFound } from 'next/navigation';
import Link from 'next/link';
import { contentIntelAllowed } from '@/lib/content/access';
import { loadApp } from '@/lib/data/load';
import { requireWorkspace } from '@/lib/auth';
import { loadItem, loadReports, limits } from '@/lib/content/server';
import { impactFor } from '@/lib/content/business';
import { formatCents } from '@/lib/finance/core.js';
import { ReadOnlyNote } from '@/components/ui';
import { ContentDetail } from './ContentDetail';

export const metadata = { title: 'Content' };

export default async function ContentItemPage({ params }: { params: { id: string } }) {
  if (!(await contentIntelAllowed()) || !/^[0-9a-f-]{36}$/.test(params.id)) notFound();
  const app = await loadApp();
  const c = await requireWorkspace();
  const data = await loadItem(c, params.id);
  if (!data) notFound();
  const reports = await loadReports(c, params.id);
  const { data: linkRows, error: le } = await c.sb.from('content_links').select('id,content_id,deal_id,income_id,note').eq('content_id', params.id);
  if (le) throw le;
  const impact = impactFor(params.id, (linkRows ?? []).map((l: any) => ({ id: l.id, contentId: l.content_id, dealId: l.deal_id, incomeId: l.income_id, note: l.note })), app.input);
  const dealOptions = app.demo ? [] : app.input.deals.filter(d => !impact.deals.some(x => x.dealId === d.id)).map(d => ({ id: d.id, label: `${d.brandName}${d.campaign ? ' – ' + d.campaign : ''}${d.feeCents ? ` · ${formatCents(d.feeCents)}${d.feeIsEstimate ? ' (estimate)' : ''}` : ''}` }));
  const incomeOptions = app.demo ? [] : app.input.income.filter(e => !impact.income.some(x => x.incomeId === e.id)).map(e => ({ id: e.id, label: `${e.counterparty || e.description || 'Income'} · ${formatCents(e.amountCents)} · ${e.receivedOn}` }));
  const L = limits();
  return (
    <>
      <Link href="/content-intelligence" className="w-fit text-[13px] text-sub underline underline-offset-2">← Content library</Link>
      <ReadOnlyNote show={app.readOnly} />
      <ContentDetail {...data} impact={impact} dealOptions={dealOptions} incomeOptions={incomeOptions} reports={reports.map(r => ({ id: r.id, mode: r.mode, title: r.report.title, savedAt: r.savedAt, createdAt: r.createdAt }))} today={app.metrics.today} readOnly={app.readOnly}
        limits={{ videoMb: Math.round(L.videoBytes / 1048576), imageMb: Math.round(L.imageBytes / 1048576), videoSeconds: L.videoSeconds, frames: L.framesPerVideo, insights: L.insightsPerItem }} />
    </>
  );
}
