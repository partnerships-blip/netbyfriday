'use client';
// CSV import wizard: choose a file, match columns, preview with validation and duplicate checks, confirm.
// The preview runs here; the server action repeats every check before writing.
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Btn, Card, Eyebrow, Pill, Select, cx } from '@/components/ui';
import { toast } from '@/components/Toaster';
import { formatCents } from '@/lib/finance/core.js';
import { parseCsv, guessMapping, checkAll, FIELDS, MAX_ROWS, MAX_BYTES, type ImportKind } from '@/lib/import/csv';
import { importCsv } from '../csv-import-actions';

export type Run = { id: string; kind: ImportKind; fileName: string; total: number; imported: number; duplicates: number; failed: number; problems: { line: number; kind: string; text: string }[]; createdAt: string };

const NOUN = { deals: ['partnership', 'partnerships'], contacts: ['contact', 'contacts'] } as const;
const TEMPLATE = {
  deals: 'Brand,Campaign,Fee,Stage,Contact name,Contact email,Start date,Payment terms,Notes\nExample Brand,Spring launch,2500,Contracted,Alex Kim,alex@example.com,2026-03-01,Net 30,2 TikToks + 1 Reel\n',
  contacts: 'Name,Email,Brand or agency,Role,Phone,Notes\nAlex Kim,alex@example.com,Example Brand,Influencer marketing manager,,Met at a launch event\n'
};
const STAGE_LABEL: Record<string, string> = { lead: 'Lead', pitching: 'Pitching', negotiating: 'Negotiating', contracted: 'Contracted', in_progress: 'In progress', completed: 'Completed', paid: 'Paid', lost: 'Lost' };
const plural = (n: number, k: ImportKind) => `${n} ${NOUN[k][n === 1 ? 0 : 1]}`;

export function ImportClient({ initialKind, existing, runs, readOnly }: { initialKind: ImportKind; existing: Record<ImportKind, string[]>; runs: Run[]; readOnly: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState<ImportKind>(initialKind);
  const [file, setFile] = useState<{ name: string; headers: string[]; rows: string[][] } | null>(null);
  const [map, setMap] = useState<Record<string, number | null>>({});
  const [skipDup, setSkipDup] = useState(true);
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [done, setDone] = useState<{ kind: ImportKind; message: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const existingSet = useMemo(() => new Set(existing[kind]), [existing, kind]);
  const checked = useMemo(() => file ? checkAll(kind, file.rows, map, existingSet) : [], [file, kind, map, existingSet]);
  const missingRequired = FIELDS[kind].filter(f => f.required && map[f.key] == null);
  const counts = {
    ready: checked.filter(r => r.value && !r.duplicate && !r.warnings.length).length,
    notes: checked.filter(r => r.value && !r.duplicate && r.warnings.length).length,
    dups: checked.filter(r => r.value && r.duplicate).length,
    errors: checked.filter(r => !r.value).length
  };
  const toImport = counts.ready + counts.notes + (skipDup ? 0 : counts.dups);

  function choose(k: ImportKind) { setKind(k); setDone(null); if (file) setMap(guessMapping(k, file.headers)); router.replace(`/import?kind=${k}`, { scroll: false }); }

  async function load(f: File | undefined) {
    if (!f) return;
    setDone(null);
    if (f.size > MAX_BYTES) return toast('That file is over 2 MB. Split it into smaller files.');
    if (/\.(xlsx?|numbers)$/i.test(f.name)) return toast('Save the sheet as CSV first: File › Download (or Export) › CSV.');
    const rows = parseCsv(await f.text());
    if (rows.length < 2) return toast('No rows found. The first row should be column names, with your records below it.');
    if (rows.length - 1 > MAX_ROWS) return toast(`That file has ${rows.length - 1} rows. Import up to ${MAX_ROWS} at a time.`);
    const headers = rows[0].map((h, i) => h || `Column ${i + 1}`);
    setFile({ name: f.name, headers, rows: rows.slice(1) });
    setMap(guessMapping(kind, headers));
  }

  async function confirm() {
    if (!file || readOnly) return;
    setBusy(true);
    const r = await importCsv({ kind, fileName: file.name, rows: file.rows, map, skipDuplicates: skipDup, confirmed: true });
    setBusy(false);
    if (!r.ok) return toast(r.error);
    toast(r.message ?? 'Imported');
    setDone({ kind, message: r.message ?? '' }); setFile(null); setMap({});
    router.refresh();
  }

  const shown = (onlyIssues ? checked.filter(r => !r.value || r.duplicate || r.warnings.length) : checked).slice(0, 100);
  const status = (r: typeof checked[number]) => !r.value ? <Pill tone="danger">Problem</Pill> : r.duplicate ? <Pill tone="neutral">{r.duplicate === 'existing' ? 'Already added' : 'Repeated'}</Pill> : r.warnings.length ? <Pill tone="warn">Check</Pill> : <Pill tone="ok">Ready</Pill>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-[10px] bg-lavender p-[3px]" role="tablist" aria-label="What are you importing?">
          {(['deals', 'contacts'] as const).map(k => <button key={k} role="tab" aria-selected={kind === k} onClick={() => choose(k)} className={cx('h-9 rounded-[8px] px-4 text-sm font-semibold', kind === k ? 'bg-white shadow-sm' : 'text-sub')}>{k === 'deals' ? 'Partnerships' : 'Contacts'}</button>)}
        </div>
        <a className="text-[13px] font-semibold text-sub underline underline-offset-2" download={`netbyfriday-${kind}-template.csv`} href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE[kind])}`}>Download a template</a>
      </div>

      {done && <Card className="flex flex-wrap items-center justify-between gap-3 border-ok/40 p-5">
        <span className="text-[15px] font-semibold">{done.message}</span>
        <Link href={done.kind === 'deals' ? '/partnerships' : '/contacts'} className="inline-flex h-9 items-center rounded-[10px] bg-plum px-3.5 text-[13px] font-semibold text-white">View {NOUN[done.kind][1]}</Link>
      </Card>}

      {!file ? (
        <Card className="p-5">
          <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); load(e.dataTransfer.files[0]); }}
            className={cx('flex flex-col items-center gap-3 rounded-[14px] border-2 border-dashed px-6 py-10 text-center', drag ? 'border-ink bg-soft2' : 'border-line2')}>
            <span className="text-[17px] font-semibold">Drop a CSV of your {NOUN[kind][1]} here</span>
            <span className="max-w-[520px] text-[13px] leading-relaxed text-sub">The first row should be column names. In Google Sheets: File › Download › Comma-separated values. In Excel or Numbers: Export as CSV. Up to {MAX_ROWS} rows.</span>
            <Btn variant="primary" disabled={readOnly} onClick={() => input.current?.click()}>Choose a CSV file</Btn>
            <input ref={input} type="file" accept=".csv,.tsv,.txt,text/csv" className="sr-only" aria-label="CSV file" onChange={e => { load(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
        </Card>
      ) : (<>
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0"><Eyebrow>Step 1 · Match your columns</Eyebrow><p className="mt-1 truncate text-[14px] text-sub">{file.name} · {file.rows.length} row{file.rows.length === 1 ? '' : 's'}</p></div>
            <button className="text-[13px] font-semibold text-sub underline underline-offset-2" onClick={() => { setFile(null); setMap({}); }}>Choose a different file</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS[kind].map(f => (
              <label key={f.key} className="flex min-w-0 flex-col gap-1.5 text-[13px] font-medium">
                <span>{f.label}{f.required && <span className="text-danger"> *</span>}</span>
                <Select aria-label={`Column for ${f.label}`} value={map[f.key] ?? ''} onChange={e => setMap(m => ({ ...m, [f.key]: e.target.value === '' ? null : Number(e.target.value) }))}>
                  <option value="">Don’t import</option>
                  {file.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </Select>
                {map[f.key] != null && <span className="truncate text-[12px] font-normal text-muted">e.g. {file.rows.find(r => r[map[f.key]!])?.[map[f.key]!] || '(empty)'}</span>}
              </label>))}
          </div>
          {missingRequired.length > 0 && <p className="text-[13px] font-semibold text-danger">Choose a column for {missingRequired.map(f => f.label).join(', ')} to continue.</p>}
        </Card>

        {!missingRequired.length && <Card className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Eyebrow>Step 2 · Check the preview</Eyebrow>
            <div className="flex flex-wrap gap-1.5" aria-live="polite">
              <Pill tone="ok">{counts.ready} ready</Pill>
              {counts.notes > 0 && <Pill tone="warn">{counts.notes} to check</Pill>}
              {counts.dups > 0 && <Pill tone="neutral">{counts.dups} duplicate{counts.dups === 1 ? '' : 's'}</Pill>}
              {counts.errors > 0 && <Pill tone="danger">{counts.errors} with problems</Pill>}
            </div>
          </div>
          <label className="flex w-fit items-center gap-2 text-[13px] font-medium"><input type="checkbox" checked={onlyIssues} onChange={e => setOnlyIssues(e.target.checked)} />Show only rows that need attention</label>
          <div className="overflow-x-auto rounded-[12px] border border-line">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="bg-soft2 font-mono text-[10px] uppercase tracking-[.08em] text-muted"><tr>
                <th className="px-3 py-2">Row</th><th className="px-3 py-2">Status</th>
                {kind === 'deals' ? <><th className="px-3 py-2">Brand</th><th className="px-3 py-2">Campaign</th><th className="px-3 py-2">Fee</th><th className="px-3 py-2">Stage</th></> : <><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Brand</th></>}
                <th className="px-3 py-2">Notes</th></tr></thead>
              <tbody>{shown.map(r => { const v = r.value as any; return (
                <tr key={r.line} className="border-t border-line align-top">
                  <td className="px-3 py-2 font-mono text-muted">{r.line}</td><td className="px-3 py-2">{status(r)}</td>
                  {kind === 'deals' ? <><td className="px-3 py-2 font-medium">{v?.brand ?? '—'}</td><td className="px-3 py-2">{v?.campaign || '—'}</td><td className="px-3 py-2 tnum">{v ? formatCents(v.feeCents) : '—'}</td><td className="px-3 py-2">{v ? STAGE_LABEL[v.stage] : '—'}</td></>
                    : <><td className="px-3 py-2 font-medium">{v?.name ?? '—'}</td><td className="px-3 py-2">{v?.email || '—'}</td><td className="px-3 py-2">{v?.brand || '—'}</td></>}
                  <td className="px-3 py-2 text-sub">{[...r.errors, ...r.warnings, r.duplicate === 'existing' ? 'Already in your workspace' : r.duplicate === 'file' ? 'Same as an earlier row' : ''].filter(Boolean).join(' · ') || ''}</td>
                </tr>); })}</tbody>
            </table>
          </div>
          {checked.length > shown.length && !onlyIssues && <p className="text-[12px] text-muted">Showing the first {shown.length} of {checked.length} rows. Every row is checked.</p>}
          {kind === 'deals' && <p className="text-[13px] leading-relaxed text-sub">Imported partnerships don’t create invoices or payments, so nothing here counts as revenue. Record payments as you receive them, or for any partnership already paid.</p>}
          {counts.dups > 0 && <label className="flex w-fit items-center gap-2 text-[13px] font-medium"><input type="checkbox" checked={skipDup} onChange={e => setSkipDup(e.target.checked)} />Skip duplicates (recommended)</label>}
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Btn variant="primary" size="lg" disabled={busy || readOnly || toImport === 0} onClick={confirm}>{busy ? 'Importing…' : `Import ${plural(toImport, kind)}`}</Btn>
            {counts.errors > 0 && <span className="text-[13px] text-sub">{counts.errors} row{counts.errors === 1 ? '' : 's'} with problems will be left out. Fix them in your sheet and import again.</span>}
          </div>
        </Card>}
      </>)}

      <Card className="flex flex-col gap-2 p-5">
        <Eyebrow>Import history</Eyebrow>
        {!runs.length && <p className="text-[13px] text-sub">No imports yet. Each import you confirm is listed here with what came in and what was skipped.</p>}
        {runs.map(r => (
          <details key={r.id} className="group border-b border-line py-2.5 last:border-0">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-[14px]">
              <span className="min-w-0"><span className="font-semibold">{plural(r.imported, r.kind)}</span> <span className="text-sub">from {r.fileName || 'a CSV'} · {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></span>
              <span className="flex gap-1.5">{r.duplicates > 0 && <Pill tone="neutral">{r.duplicates} skipped</Pill>}{r.failed > 0 && <Pill tone="danger">{r.failed} not imported</Pill>}</span>
            </summary>
            {r.problems.length > 0 ? <ul className="mt-2 flex flex-col gap-1 text-[13px] text-sub">{r.problems.slice(0, 50).map((p, i) => <li key={i}><span className="font-mono text-muted">Row {p.line}</span> · {p.text}</li>)}</ul>
              : <p className="mt-2 text-[13px] text-sub">All {r.total} rows imported without notes.</p>}
          </details>))}
      </Card>
    </div>
  );
}
