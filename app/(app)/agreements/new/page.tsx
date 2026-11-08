import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadApp } from '@/lib/data/load';
import { PageHeader, ReadOnlyNote } from '@/components/ui';
import { GenerateForm } from './GenerateForm';

export default async function NewAgreementPage({ searchParams }: { searchParams: { deal?: string } }) {
  const app = await loadApp();
  if (!app.agreementsOn) notFound();
  const deals = app.input.deals.filter(d => d.stage !== 'lost').map(d => ({ id: d.id, label: `${d.brandName}${d.campaign ? ' – ' + d.campaign : ''}` }));
  return (
    <>
      <Link href="/contracts" className="w-fit text-[13px] text-sub underline underline-offset-2">← Contracts</Link>
      <PageHeader title="Generate a contract" sub="Paste the brand’s email, DM or your notes, or upload a screenshot. netbyfriday pulls out the terms you discussed and fills in a plain-English creator agreement. You check every term before you sign and send it." />
      <ReadOnlyNote show={app.readOnly} />
      <GenerateForm deals={deals} initialDeal={deals.some(d => d.id === searchParams.deal) ? searchParams.deal! : ''} readOnly={app.readOnly} />
    </>
  );
}
