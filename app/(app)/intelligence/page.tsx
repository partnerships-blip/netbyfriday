import { notFound } from 'next/navigation';
import { loadApp } from '@/lib/data/load';
import { flag } from '@/lib/flags';
import { PageHeader, Card } from '@/components/ui';
import { IntelFilter } from './IntelFilter';

export default async function IntelligencePage() {
  if (!flag('insights')) notFound();
  const app = await loadApp();
  const m = app.metrics;
  return (
    <>
      <PageHeader title="Intelligence" sub="Insights calculated from your records, ranked by a transparent score." />
      <Card className="flex flex-wrap items-center gap-x-[18px] gap-y-2 px-[18px] py-4">
        <div className="text-[13px] font-semibold">Priority score</div>
        <div className="tnum flex flex-wrap gap-4 text-[13px] text-sub"><span>Financial impact 0–40</span><span>+ Urgency 0–30</span><span>+ Confidence 0–20</span><span>+ Goal relevance 0–10</span></div>
        <p className="basis-full text-xs leading-relaxed text-muted">Fixed rules calculate every insight and score from your records. The AI does not set rankings.</p>
      </Card>
      <IntelFilter insights={m.insights} deals={app.input.deals.map(d => ({ id: d.id, email: d.contactEmail, brand: d.brandName }))} invoices={m.invoices.map((v: any) => ({ id: v.id, client: v.clientName, number: v.number }))} />
    </>
  );
}
