import { notFound } from 'next/navigation';
import { flag } from '@/lib/flags';
import { loadApp } from '@/lib/data/load';
import { taxYear, taxYears } from '@/lib/finance/core.js';
import { PageHeader, ReadOnlyNote } from '@/components/ui';
import { TaxesClient } from './TaxesClient';

export default async function TaxesPage({ searchParams }: { searchParams: { year?: string } }) {
  if (!flag('taxes')) notFound();
  const app = await loadApp();
  const years = taxYears(app.input);
  const year = years.includes(Number(searchParams.year)) ? Number(searchParams.year) : years[0];
  const pct = app.invoiceSettings.taxSetAsidePct;
  return (
    <>
      <PageHeader title="Taxes" sub="A running picture of what you’ve earned, spent and should keep aside, from the money you’ve recorded. Planning numbers, not tax advice." />
      <ReadOnlyNote show={app.readOnly} />
      <TaxesClient t={taxYear(app.input, year, pct)} years={years} today={app.metrics.today} readOnly={app.readOnly} />
    </>
  );
}
