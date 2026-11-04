import { loadApp } from '@/lib/data/load';
import { flag } from '@/lib/flags';
import { PageHeader } from '@/components/ui';
import { AdvisorChat } from './AdvisorChat';

export default async function AdvisorPage() {
  const app = await loadApp();
  const i = app.input;
  const sources = `${i.deals.length} partnerships · ${i.invoices.length} invoices · ${i.payments.length} payments · ${i.income.length} income entries · ${i.expenses.length} expenses ${flag('opportunities') ? ` · ${i.opportunities.length} opportunities` : ''}${app.demo ? ' · demo data' : ''}`;
  const history = app.advisorHistory.map((h: any) => ({ id: h.id, role: h.role, content: h.content, reply: h.payload ?? null }));
  return (
    <>
      <PageHeader title="AI Advisor" sub="Ask about your business. Facts are checked against your records before they are shown." />
      <AdvisorChat sources={sources} initial={history} demo={app.demo} />
    </>
  );
}
