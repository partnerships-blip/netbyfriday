'use client';
import { useState } from 'react';
import { Modal } from './Modal';
import { Btn, Field, Input } from './ui';
import { useAction } from './Toaster';
import { importPrototype } from '@/app/(app)/import-actions';

const KEY = 'ci_state_v1';

/** Imports "My workspace" records from the browser prototype. Never imports demo data. Requires explicit confirmation. */
export function ImportPrototype({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (summary: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [anchor, setAnchor] = useState(new Date().toISOString().slice(0, 7));
  const [includeRevenue, setIncludeRevenue] = useState(false);
  const [includeBrand, setIncludeBrand] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, run] = useAction();

  const accept = (state: any) => {
    const mine = state?.mine ?? state;
    if (!mine || !Array.isArray(mine.deals)) return setErr('No prototype workspace data was found.');
    setErr(''); setData(mine);
  };
  const fromBrowser = () => { try { const raw = localStorage.getItem(KEY); if (!raw) return setErr('No prototype data in this browser. The prototype must have been used on this same site address. Otherwise, upload an export file.'); accept(JSON.parse(raw)); } catch { setErr('The saved data could not be read.'); } };
  const fromFile = async (f?: File) => { if (!f) return; if (f.size > 1_500_000) return setErr('That file is too large.'); try { accept(JSON.parse(await f.text())); } catch { setErr('That file is not valid JSON.'); } };
  const revMonths = data ? Object.values(data.revenue ?? {}).flat().filter((x: any) => x > 0).length : 0;

  return (
    <Modal open={open} onClose={onClose} wide>
      <div className="flex flex-col gap-3.5">
        <h2 className="font-head text-[28px]">Import from the prototype</h2>
        <p className="text-[13px] leading-relaxed text-sub">Copies the records you entered in the prototype's “My workspace” into your account. Demo data is never imported. Running this twice will not create duplicates.</p>
        {!data && <div className="flex flex-wrap gap-2">
          <Btn variant="primary" onClick={fromBrowser}>Read from this browser</Btn>
          <label className="inline-flex h-9 cursor-pointer items-center rounded-[10px] border border-line2 px-3.5 text-[13px] font-medium">Upload export (.json)<input type="file" accept="application/json,.json" className="hidden" onChange={e => fromFile(e.target.files?.[0])} /></label>
        </div>}
        {err && <p className="text-sm text-danger">{err}</p>}
        {data && <>
          <div className="rounded-xl bg-bg p-3.5 text-sm leading-relaxed">
            Found {data.deals?.length ?? 0} partnerships, {data.invoices?.length ?? 0} invoices, {(data.invoices ?? []).reduce((a: number, v: any) => a + (v.payments?.length ?? 0), 0)} payments, {data.expenses?.length ?? 0} expenses, {data.opps?.length ?? 0} opportunities, and {revMonths} monthly revenue totals.
          </div>
          <label className="flex items-start gap-2 text-[13px] leading-snug"><input type="checkbox" className="mt-0.5" checked={includeRevenue} onChange={e => setIncludeRevenue(e.target.checked)} />
            <span>Import monthly revenue totals as income entries. Only do this for income that was not invoiced, or it will be counted twice.</span></label>
          {includeRevenue && <>
            <Field label="Month you last used the prototype"><Input type="month" value={anchor} onChange={e => setAnchor(e.target.value)} /></Field>
            <p className="text-xs leading-relaxed text-muted">The prototype stored totals by position relative to the month it was used, not by date. This anchors them to the right calendar months.</p>
            <label className="flex items-start gap-2 text-[13px] leading-snug"><input type="checkbox" className="mt-0.5" checked={includeBrand} onChange={e => setIncludeBrand(e.target.checked)} />
              <span>Also import the “Brand partnerships” totals. Leave this off if those deals are already invoiced above.</span></label>
          </>}
          <label className="flex items-start gap-2 text-[13px] font-medium"><input type="checkbox" className="mt-0.5" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Copy these records into my account</label>
          <div className="flex gap-2">
            <Btn variant="primary" disabled={!confirmed || pending} onClick={() => run(() => importPrototype(data, { anchorMonth: anchor, includeRevenue, includeBrandRevenue: includeBrand, confirmed: true }), r => onDone(r.ok && r.message ? r.message : 'Imported'))}>{pending ? 'Importing…' : 'Import'}</Btn>
            <Btn onClick={onClose}>Cancel</Btn>
          </div>
        </>}
      </div>
    </Modal>
  );
}
