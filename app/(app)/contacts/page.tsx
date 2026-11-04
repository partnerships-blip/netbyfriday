import { loadApp } from '@/lib/data/load';
import { PageHeader, ReadOnlyNote } from '@/components/ui';
import { ContactsClient, type BrandRow } from './ContactsClient';

export default async function ContactsPage({ searchParams }: { searchParams: { contact?: string; brand?: string } }) {
  const app = await loadApp();
  const { input: i, metrics: m } = app;
  const contacts = i.contacts ?? [];
  // Brand roll-up. Money received comes only from the ledger (payments + income), never from fees.
  const brands: BrandRow[] = app.brandList.map(b => {
    const deals = i.deals.filter(d => d.brandId === b.id);
    const ids = new Set(deals.map(d => d.id));
    const invoices = m.invoices.filter((v: any) => (v.dealId && ids.has(v.dealId)) || v.clientName.toLowerCase() === b.name.toLowerCase());
    return {
      id: b.id, name: b.name,
      deals: deals.map(d => ({ id: d.id, label: d.campaign || d.brandName, stage: d.stage, feeCents: d.feeCents, startedOn: d.startedOn })),
      activeCount: deals.filter(d => ['contracted', 'in_progress'].includes(d.stage)).length,
      // Payments recorded on this brand's invoices (linked to its partnerships, or billed to it by name).
      receivedCents: invoices.reduce((a: number, v: any) => a + v.paidCents, 0),
      openCents: invoices.reduce((a: number, v: any) => a + v.balanceCents, 0),
      invoices: invoices.map((v: any) => ({ id: v.id, number: v.number, amountCents: v.amountCents, balanceCents: v.balanceCents, state: v.state, dueOn: v.dueOn })),
      lastContactOn: deals.reduce((a: string | null, d) => (!a || d.lastContactOn > a ? d.lastContactOn : a), null),
      contactIds: contacts.filter(c => c.brandId === b.id).map(c => c.id)
    };
  });
  return (
    <>
      <PageHeader title="Brands & Contacts" sub="The people and companies you work with, and everything connected to them." />
      <ReadOnlyNote show={app.readOnly} />
      <ContactsClient contacts={contacts} brands={brands} tasks={i.tasks ?? []} today={m.today} readOnly={app.readOnly}
        deals={i.deals.map(d => ({ id: d.id, brandId: d.brandId, contactId: d.contactId ?? null, label: `${d.brandName}${d.campaign ? ' – ' + d.campaign : ''}`, stage: d.stage }))}
        initialContact={searchParams.contact ?? null} initialBrand={searchParams.brand ?? null} />
    </>
  );
}
