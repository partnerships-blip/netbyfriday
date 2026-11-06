import { loadApp } from '@/lib/data/load';
import { requireWorkspace } from '@/lib/auth';
import { existingKeys } from '@/lib/import/existing';
import { PageHeader, ReadOnlyNote } from '@/components/ui';
import { ImportClient, type Run } from './ImportClient';

export const metadata = { title: 'Import from a spreadsheet' };

export default async function ImportPage({ searchParams }: { searchParams: { kind?: string } }) {
  const app = await loadApp();
  let keys = { deals: [] as string[], contacts: [] as string[] }, runs: Run[] = [];
  if (!app.demo) {
    const c = await requireWorkspace();
    const [d, k, h] = await Promise.all([existingKeys(c, 'deals'), existingKeys(c, 'contacts'),
      c.sb.from('import_runs').select('id,kind,file_name,total_rows,imported,duplicates,failed,problems,created_at').eq('workspace_id', c.ws.id).order('created_at', { ascending: false }).limit(20)]);
    keys = { deals: d, contacts: k };
    if (h.error) throw h.error;
    runs = (h.data ?? []).map((r: any) => ({ id: r.id, kind: r.kind, fileName: r.file_name, total: r.total_rows, imported: r.imported, duplicates: r.duplicates, failed: r.failed, problems: r.problems ?? [], createdAt: r.created_at }));
  }
  return (
    <>
      <PageHeader title="Import from a spreadsheet" sub="Bring your partnerships or contacts over from Google Sheets, Excel, Notion or Airtable. Export a CSV, match the columns, check the preview, then confirm. Nothing is saved until you do." />
      <ReadOnlyNote show={app.readOnly} />
      <ImportClient initialKind={searchParams.kind === 'contacts' ? 'contacts' : 'deals'} existing={keys} runs={runs} readOnly={app.readOnly} />
    </>
  );
}
