import { notFound } from 'next/navigation';
import Link from 'next/link';
import { flag } from '@/lib/flags';
import { loadApp } from '@/lib/data/load';
import { requireWorkspace } from '@/lib/auth';
import { loadReport } from '@/lib/content/server';
import { ReadOnlyNote } from '@/components/ui';
import { ReportView } from './ReportView';

export const metadata = { title: 'Content analysis' };

export default async function AnalysisPage({ params }: { params: { id: string; reportId: string } }) {
  if (!flag('contentIntel') || !/^[0-9a-f-]{36}$/.test(params.id) || !/^[0-9a-f-]{36}$/.test(params.reportId)) notFound();
  const app = await loadApp();
  const data = await loadReport(await requireWorkspace(), params.id, params.reportId);
  if (!data) notFound();
  return (
    <>
      <Link href={`/content-intelligence/${params.id}`} className="w-fit text-[13px] text-sub underline underline-offset-2">← {data.item.title}</Link>
      <ReadOnlyNote show={app.readOnly} />
      <ReportView {...data} readOnly={app.readOnly} />
    </>
  );
}
