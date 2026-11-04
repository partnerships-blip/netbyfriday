import { loadApp } from '@/lib/data/load';
import { PageHeader, ReadOnlyNote } from '@/components/ui';
import { ContentClient } from './ContentClient';

export default async function ContentPage() {
  const app = await loadApp();
  const rows = app.input.deals.filter(d => d.stage !== 'lost').flatMap(d => d.deliverables.map(x => ({ ...x, brandName: d.brandName, campaign: d.campaign })));
  return (
    <>
      <PageHeader title="Content" sub="Every deliverable you owe, across all your partnerships." />
      <ReadOnlyNote show={app.readOnly} />
      <ContentClient rows={rows} today={app.metrics.today} readOnly={app.readOnly} />
    </>
  );
}
