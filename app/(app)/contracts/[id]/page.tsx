import { notFound } from 'next/navigation';
import Link from 'next/link';
import { flag } from '@/lib/flags';
import { loadApp } from '@/lib/data/load';
import { ReadOnlyNote } from '@/components/ui';
import { ContractReview } from './ContractReview';

export default async function ContractPage({ params }: { params: { id: string } }) {
  if (!flag('contracts')) notFound();
  const app = await loadApp();
  const c = app.contracts.find(x => x.id === params.id);
  if (!c) notFound();
  const deals = app.input.deals.map(d => ({ id: d.id, label: `${d.brandName}${d.campaign ? ' – ' + d.campaign : ''}`, brandName: d.brandName, feeCents: d.feeCents }));
  return (
    <>
      <Link href="/contracts" className="w-fit text-[13px] text-sub underline underline-offset-2">← All contracts</Link>
      <ReadOnlyNote show={app.readOnly} />
      <ContractReview contract={c} deals={deals} readOnly={app.readOnly} today={app.metrics.today} demo={app.demo} />
    </>
  );
}
