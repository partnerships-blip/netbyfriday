import { notFound } from 'next/navigation';
import Link from 'next/link';
import { flag } from '@/lib/flags';
import { loadApp } from '@/lib/data/load';
import { requireWorkspace } from '@/lib/auth';
import { loadItem, limits } from '@/lib/content/server';
import { ReadOnlyNote } from '@/components/ui';
import { ContentDetail } from './ContentDetail';

export const metadata = { title: 'Content' };

export default async function ContentItemPage({ params }: { params: { id: string } }) {
  if (!flag('contentIntel') || !/^[0-9a-f-]{36}$/.test(params.id)) notFound();
  const app = await loadApp();
  const data = await loadItem(await requireWorkspace(), params.id);
  if (!data) notFound();
  const L = limits();
  return (
    <>
      <Link href="/content-intelligence" className="w-fit text-[13px] text-sub underline underline-offset-2">← Content library</Link>
      <ReadOnlyNote show={app.readOnly} />
      <ContentDetail {...data} today={app.metrics.today} readOnly={app.readOnly}
        limits={{ videoMb: Math.round(L.videoBytes / 1048576), imageMb: Math.round(L.imageBytes / 1048576), videoSeconds: L.videoSeconds, frames: L.framesPerVideo, insights: L.insightsPerItem }} />
    </>
  );
}
