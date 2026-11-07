import { notFound } from 'next/navigation';
import { flag } from '@/lib/flags';
import { loadApp } from '@/lib/data/load';
import { requireWorkspace } from '@/lib/auth';
import { loadLibrary } from '@/lib/content/server';
import { PageHeader, ReadOnlyNote } from '@/components/ui';
import { LibraryClient } from './LibraryClient';

export const metadata = { title: 'Content Intelligence' };

export default async function ContentIntelligencePage() {
  if (!flag('contentIntel')) notFound();
  const app = await loadApp();
  const rows = app.demo ? [] : await loadLibrary(await requireWorkspace());
  return (
    <>
      <PageHeader title="Content Intelligence" sub="Know what’s working. Understand why. Create what’s next. Add a post, upload the video or your insights screenshot, and get a review grounded in what you gave it." />
      <ReadOnlyNote show={app.readOnly} />
      <LibraryClient rows={rows} today={app.metrics.today} readOnly={app.readOnly} demo={app.demo} />
    </>
  );
}
