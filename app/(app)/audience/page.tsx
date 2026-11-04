import { notFound } from 'next/navigation';
import { loadApp } from '@/lib/data/load';
import { flag } from '@/lib/flags';
import { PageHeader, ReadOnlyNote } from '@/components/ui';
import { AudienceClient } from './AudienceClient';

export default async function AudiencePage() {
  if (!flag('audience')) notFound();
  const app = await loadApp();
  const { input, metrics: m } = app;
  const platforms = Array.from(new Set([...input.audience.map(a => a.platform), ...app.profile.platforms]));
  const series = platforms.map(p => ({ platform: p, points: input.audience.filter(a => a.platform === p).sort((a, b) => (a.capturedOn < b.capturedOn ? -1 : 1)) }));
  // Revenue per content category: money received on partnerships tagged with that category (ledger only).
  const revByCat: Record<string, number> = {};
  for (const e of m.ledger) { const d = e.dealId && input.deals.find(x => x.id === e.dealId); if (d && d.contentCategory) revByCat[d.contentCategory] = (revByCat[d.contentCategory] || 0) + e.amountCents; }
  const note = m.insights.find((i: any) => i.id === 'audience-vs-revenue');
  return (
    <>
      <PageHeader title="Audience" sub="Platform metrics you enter, and how content categories compare with money received. Comparison is not attribution." />
      <ReadOnlyNote show={app.readOnly} />
      <AudienceClient series={series} categories={input.categories} revByCat={revByCat} note={note ? `${note.title}. ${note.explain}` : 'Views and revenue are shown side by side. Neither is assumed to cause the other.'} readOnly={app.readOnly} today={m.today} />
    </>
  );
}
