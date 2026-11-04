import { loadApp } from '@/lib/data/load';
import { flag } from '@/lib/flags';
import { PageHeader } from '@/components/ui';
import { AdvisorChat } from './AdvisorChat';

export default async function AdvisorPage() {
  const app = await loadApp();
  const i = app.input;
  const sources = `${i.deals.length} partnerships · ${(i.contacts ?? []).length} contacts · ${(i.tasks ?? []).filter(t => t.status === 'open').length} open tasks · ${i.invoices.length} invoices · ${i.payments.length} payments · ${i.income.length} income entries · ${i.expenses.length} expenses ${flag('opportunities') ? ` · ${i.opportunities.length} opportunities` : ''}${app.demo ? ' · demo data' : ''}`;
  const history = app.advisorHistory.map((h: any) => ({ id: h.id, role: h.role, content: h.content, reply: h.payload ?? null }));
  // Recipient addresses for drafts, looked up from the creator's own records. The Advisor never sees or chooses them.
  const contactEmail = new Map((i.contacts ?? []).map(c => [c.id, c.email]));
  const dealEmail = (dealId: string | null) => { const d = dealId ? i.deals.find(x => x.id === dealId) : undefined; return d ? (d.contactId && contactEmail.get(d.contactId)) || d.contactEmail : ''; };
  const emails: Record<string, string> = Object.fromEntries([
    ...(i.contacts ?? []).map(c => ['contact:' + c.id, c.email]), ...i.deals.map(d => ['deal:' + d.id, dealEmail(d.id)]), ...i.invoices.map(v => ['invoice:' + v.id, dealEmail(v.dealId)])
  ].filter(([, e]) => e));
  return (
    <>
      <PageHeader title="AI Advisor" sub="Ask about your business. Facts are checked against your records before they are shown." />
      <AdvisorChat sources={sources} initial={history} demo={app.demo} emails={emails} />
    </>
  );
}
