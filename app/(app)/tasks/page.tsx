import { loadApp } from '@/lib/data/load';
import { PageHeader, ReadOnlyNote } from '@/components/ui';
import { TasksClient } from './TasksClient';

export default async function TasksPage() {
  const app = await loadApp();
  const i = app.input;
  return (
    <>
      <PageHeader title="Tasks" sub="Your to-dos, linked to the partnerships, contacts and invoices they belong to." />
      <ReadOnlyNote show={app.readOnly} />
      <TasksClient tasks={i.tasks ?? []} today={app.metrics.today} readOnly={app.readOnly}
        deals={i.deals.map(d => ({ id: d.id, label: `${d.brandName}${d.campaign ? ' – ' + d.campaign : ''}` }))}
        contacts={(i.contacts ?? []).map(c => ({ id: c.id, label: `${c.name}${c.brandName ? ' · ' + c.brandName : ''}` }))}
        invoices={app.metrics.invoices.map((v: any) => ({ id: v.id, label: `${v.number} · ${v.clientName}` }))} />
    </>
  );
}
