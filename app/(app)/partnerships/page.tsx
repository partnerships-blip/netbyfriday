import { loadApp } from '@/lib/data/load';
import { PageHeader, ReadOnlyNote } from '@/components/ui';
import { formatCents } from '@/lib/finance/core.js';
import { flag } from '@/lib/flags';
import { Board } from './Board';

export default async function PartnershipsPage({ searchParams }: { searchParams: { deal?: string } }) {
  const app = await loadApp();
  const m = app.metrics;
  const deals = app.input.deals;
  const invoices = m.invoices.map((v: any) => ({ id: v.id, number: v.number, dealId: v.dealId, clientName: v.clientName, amountCents: v.amountCents, paidCents: v.paidCents, state: v.state, payments: v.payments }));
  const summary = `${deals.filter(d => d.stage !== 'lost').length} partnerships · ${formatCents(m.active.reduce((a: number, d: any) => a + d.feeCents, 0))} active · ${formatCents(m.pipelineCents)} in pipeline (unconfirmed) · ${formatCents(m.uninvoicedCents)} contracted but not invoiced`;
  return (
    <>
      <PageHeader title="Partnerships" sub="Every brand deal from first inquiry to final payment." />
      <ReadOnlyNote show={app.readOnly} />
      <Board deals={deals} invoices={invoices} received={m.receivedByDeal} summary={summary} initialDeal={searchParams.deal ?? null} readOnly={app.readOnly} today={m.today} contacts={app.input.contacts ?? []} tasks={app.input.tasks ?? []} contracts={flag('contracts') ? app.contracts ?? [] : []} />
    </>
  );
}
