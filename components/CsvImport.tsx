'use client';
import { useState } from 'react';
import { Modal } from './Modal';
import { Btn } from './ui';
import { useAction } from './Toaster';
import { parseCsv, csvToDealRows } from '@/lib/csv';
import { importCsvDeals } from '@/app/(app)/actions';
import { STAGE_LABEL } from '@/lib/brand';

export function CsvImport({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (n: number) => void }) {
  const [rows, setRows] = useState<ReturnType<typeof csvToDealRows>['rows']>([]);
  const [err, setErr] = useState('');
  const [pending, run] = useAction();
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 2_000_000) return setErr('Keep the file under 2 MB.');
    const r = csvToDealRows(parseCsv(await f.text()));
    setErr(r.error); setRows(r.rows);
  };
  return (
    <Modal open={open} onClose={onClose} wide>
      <div className="flex flex-col gap-3.5">
        <h2 className="font-head text-[28px]">Import partnerships from CSV</h2>
        <p className="text-[13px] leading-relaxed text-sub">Columns: <code className="font-mono">brand</code> (required), <code className="font-mono">campaign, fee, stage, date</code> (YYYY-MM-DD). Imported fees describe the deal only; they are not counted as revenue until you record a payment.</p>
        <label className="inline-flex h-10 w-fit cursor-pointer items-center rounded-[10px] bg-ink px-4 text-sm text-white">Choose CSV file<input type="file" accept=".csv,text/csv" className="hidden" onChange={e => onFile(e.target.files?.[0])} /></label>
        {err && <p className="text-sm text-danger">{err}</p>}
        {rows.length > 0 && <div className="max-h-[260px] overflow-auto rounded-xl border border-line">
          <table className="w-full text-left text-[13px]"><thead className="bg-paper font-mono text-[10px] uppercase tracking-wider text-muted"><tr><th className="p-2">Brand</th><th className="p-2">Campaign</th><th className="p-2">Fee</th><th className="p-2">Stage</th><th className="p-2">Date</th></tr></thead>
            <tbody>{rows.slice(0, 50).map((r, i) => <tr key={i} className="border-t border-soft2"><td className="p-2">{r.brand}</td><td className="p-2">{r.campaign}</td><td className="p-2">{r.fee}</td><td className="p-2">{STAGE_LABEL[r.stage]}</td><td className="p-2">{r.date ?? 'today'}</td></tr>)}</tbody></table>
        </div>}
        <div className="flex gap-2">
          <Btn variant="primary" disabled={!rows.length || pending} onClick={() => run(() => importCsvDeals(rows), () => onDone(rows.length))}>{pending ? 'Importing…' : `Import ${rows.length || ''} rows`}</Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </Modal>
  );
}
