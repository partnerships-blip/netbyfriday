import { notFound } from 'next/navigation';
import { flag } from '@/lib/flags';
import { loadApp } from '@/lib/data/load';
import { contractWindows } from '@/lib/finance/core.js';
import { PageHeader, ReadOnlyNote } from '@/components/ui';
import { ContractsClient } from './ContractsClient';

export default async function ContractsPage() {
  if (!flag('contracts')) notFound();
  const app = await loadApp();
  const today = app.metrics.today;
  const dealLabel = new Map(app.input.deals.map(d => [d.id, `${d.brandName}${d.campaign ? ' – ' + d.campaign : ''}`]));
  return (
    <>
      <PageHeader title="Contracts" sub="Upload a contract and netbyfriday reads the terms for you: fee, payment terms, usage rights, exclusivity and deliverables. You check every term before anything is saved to a partnership." />
      <ReadOnlyNote show={app.readOnly} />
      <ContractsClient readOnly={app.readOnly} today={today} agreementsOn={app.agreementsOn}
        agreements={app.agreements.map(a => ({ id: a.id, title: a.title, status: a.status, brandName: String((a.terms as any)?.brandName ?? ''), updatedAt: a.updatedAt, dealLabel: a.dealId ? dealLabel.get(a.dealId) ?? null : null }))}
        contracts={app.contracts.map(c => ({ ...c, dealLabel: c.dealId ? dealLabel.get(c.dealId) ?? null : null }))}
        windows={contractWindows(app.contracts, today)} />
    </>
  );
}
