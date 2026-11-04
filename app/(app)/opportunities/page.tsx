import { notFound } from 'next/navigation';
import { loadApp } from '@/lib/data/load';
import { flag } from '@/lib/flags';
import { PageHeader, ReadOnlyNote } from '@/components/ui';
import { OppsClient } from './OppsClient';
import { formatCents } from '@/lib/finance/core.js';

export default async function OpportunitiesPage() {
  if (!flag('opportunities')) notFound();
  const app = await loadApp();
  const m = app.metrics;
  // Suggested renewals come from the deterministic engine (past paid partners with no recent contact). They are suggestions, not verified leads.
  const suggestions = m.insights.filter((i: any) => i.id.startsWith('reconnect:')).map((i: any) => ({ name: i.id.slice('reconnect:'.length), fit: i.data.join(' · '), dealId: i.dealId }))
    .filter((s: any) => !app.input.opportunities.some(o => o.name.toLowerCase() === s.name.toLowerCase()));
  return (
    <>
      <PageHeader title="Opportunities" sub="Renewals drawn from your history, plus leads you add. Nothing here is an invented sponsorship, budget, or contact." />
      <ReadOnlyNote show={app.readOnly} />
      <OppsClient opps={app.input.opportunities} suggestions={suggestions} readOnly={app.readOnly} />
      <p className="text-xs text-muted">Verified public business and event sources are planned for a later release. {m.pipeline.length ? `You also have ${m.pipeline.length} unconfirmed deals (${formatCents(m.pipelineCents)}) in Partnerships.` : ''}</p>
    </>
  );
}
