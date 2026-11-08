import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadApp } from '@/lib/data/load';
import { ReadOnlyNote } from '@/components/ui';
import { AgreementEditor } from './AgreementEditor';

export default async function AgreementPage({ params }: { params: { id: string } }) {
  const app = await loadApp();
  if (!app.agreementsOn) notFound();
  const a = app.agreements.find(x => x.id === params.id);
  if (!a) notFound();
  const deals = app.input.deals.map(d => ({ id: d.id, label: `${d.brandName}${d.campaign ? ' – ' + d.campaign : ''}` }));
  return (
    <>
      <Link href="/contracts" className="w-fit text-[13px] text-sub underline underline-offset-2">← Contracts</Link>
      <ReadOnlyNote show={app.readOnly} />
      <AgreementEditor agreement={a} deals={deals} readOnly={app.readOnly} />
    </>
  );
}
