import { loadApp } from '@/lib/data/load';
import { PageHeader, ReadOnlyNote } from '@/components/ui';
import { MoneyClient } from './MoneyClient';

export default async function MoneyPage() {
  const app = await loadApp();
  const m = app.metrics;
  return (
    <>
      <PageHeader title="Money" sub="Revenue is counted when money is received. Invoices, pipeline and contracted work are tracked separately and never added to revenue." />
      <ReadOnlyNote show={app.readOnly} />
      <MoneyClient readOnly={app.readOnly} today={m.today}
        m={{ trailing12Cents: m.trailing12Cents, thisMonthCents: m.thisMonthCents, ytdCents: m.ytdCents, outstandingCents: m.outstandingCents, overdueCents: m.overdueCents, upcomingCents: m.upcomingCents,
          expectedNext30Cents: m.expectedNext30Cents, pipelineCents: m.pipelineCents, uninvoicedCents: m.uninvoicedCents, expenses12Cents: m.expenses12Cents, profit12Cents: m.profit12Cents,
          goals: m.goals, months: m.months, byStream: m.byStream, byCounterparty: m.byCounterparty, invoices: m.invoices, overdueCount: m.overdueInvoices.length, openCount: m.openInvoices.length,
          insights: m.insights.filter((i: any) => ['Revenue', 'Payment', 'Risk'].includes(i.category)).slice(0, 3) }}
        deals={app.input.deals.map(d => ({ id: d.id, label: `${d.brandName}${d.campaign ? ' – ' + d.campaign : ''}`, email: d.contactEmail, brand: d.brandName }))}
        income={[...app.input.income].sort((a, b) => (a.receivedOn < b.receivedOn ? 1 : -1))}
        expenses={[...app.input.expenses].sort((a, b) => (a.spentOn < b.spentOn ? 1 : -1))}
        profile={app.profile} brandName={app.brand.name} />
    </>
  );
}
