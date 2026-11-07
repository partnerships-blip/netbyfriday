'use client';
// Review what was read from an insights screenshot. Clear values are filled in; anything unclear is left empty and
// flagged so it's never saved without the creator typing it. The period must be confirmed. Saving creates a new
// performance snapshot marked as coming from the screenshot.
import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Btn, Field, Input, Select, Pill, cx } from '@/components/ui';
import { useAction } from '@/components/Toaster';
import { METRICS, PERIODS } from '@/lib/content/model';
import { shownDate, type Extraction } from '@/lib/content/extract';
import { addSnapshot } from '../actions';

export function InsightReview({ open, onClose, extraction, contentId, assetId, today, onSaved, onManual, imageUrl }: {
  open: boolean; onClose: () => void; extraction: Extraction | null; contentId: string; assetId: string; today: string; onSaved: () => void; onManual: () => void; imageUrl?: string;
}) {
  const ex = extraction;
  const byKey = new Map((ex?.metrics ?? []).map(m => [m.key, m]));
  const init = () => ({
    period: ex?.period?.period ?? '', periodNote: ex?.period?.note ?? '', measuredOn: (ex && shownDate(ex.dateText, today)) ?? today,
    ...Object.fromEntries(METRICS.map(([k]) => { const m = byKey.get(k); return [k, m && m.clear && m.value != null ? String(m.value) : '']; }))
  } as Record<string, string>);
  const [v, setV] = useState<Record<string, string>>(init);
  const [err, setErr] = useState('');
  const [pending, run] = useAction();
  const [lastEx, setLastEx] = useState(ex);
  if (ex !== lastEx) { setLastEx(ex); setV(init()); setErr(''); }      // a new reading resets the form
  const set = (k: string, val: string) => { setV(s => ({ ...s, [k]: val })); setErr(''); };
  const unclear = (ex?.metrics ?? []).filter(m => !m.clear);

  const save = () => {
    if (!v.period) return setErr('Choose the period these numbers cover. We couldn’t tell from the screenshot.');
    run(async () => {
      const r = await addSnapshot({ ...v, contentId, source: 'screenshot', insightAssetId: assetId });
      if (!r.ok) setErr(r.error);
      return r.ok ? { ...r, message: 'Metrics confirmed and saved' } : r;
    }, () => { onSaved(); onClose(); });
  };

  return (
    <Modal open={open} onClose={onClose} wide>
      {!ex ? null : !ex.readable ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-head text-[28px] leading-tight">We couldn’t read this screenshot</h2>
          <p className="text-[14px] leading-relaxed text-sub">{ex.notes || 'No analytics were visible.'} Try a sharper screenshot of the insights screen, or enter the numbers yourself.</p>
          <div className="flex gap-2"><Btn variant="primary" onClick={() => { onClose(); onManual(); }}>Enter by hand</Btn><Btn onClick={onClose}>Close</Btn></div>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); save(); }}>
          <div>
            <h2 className="font-head text-[28px] leading-tight">Check the numbers</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-sub">Read from your screenshot. Fix anything that’s wrong. Nothing is saved until you confirm.</p>
          </div>
          {imageUrl && <details className="rounded-[12px] border border-line px-3 py-2 text-[13px]"><summary className="cursor-pointer font-semibold">Show the screenshot</summary><img src={imageUrl} alt="Insights screenshot being checked" className="mt-2 max-h-[420px] rounded-[8px] border border-line" /></details>}
          {unclear.length > 0 && <div role="alert" className="rounded-[12px] bg-[#FFF6D6] px-3.5 py-2.5 text-[13px] leading-snug">
            <b>{unclear.length === 1 ? '1 value wasn’t clear' : `${unclear.length} values weren’t clear`}</b>, so {unclear.length === 1 ? 'it’s' : 'they’re'} left empty: {unclear.map(m => `${m.label || m.key} (we saw “${m.text}”)`).join(', ')}. Type the right number or leave it blank.
          </div>}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="These numbers cover *">
              <Select value={v.period} onChange={e => set('period', e.target.value)} aria-invalid={!v.period}>
                <option value="">Choose the period</option>{PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Checked on"><Input type="date" value={v.measuredOn} max={today} onChange={e => set('measuredOn', e.target.value)} /></Field>
            <Field label="Period details"><Input value={v.periodNote} onChange={e => set('periodNote', e.target.value)} placeholder={ex.periodText || 'e.g. first 3 days'} /></Field>
          </div>
          {ex.periodText && <p className="-mt-2 text-[12px] text-muted">The screenshot says “{ex.periodText}”{ex.dateText ? ` · ${ex.dateText}` : ''}.</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {METRICS.map(([k, label]) => { const m = byKey.get(k); const flag = m && !m.clear;
              return (
                <Field key={k} label={label} className={cx(flag && 'text-[#7A5A00]')}>
                  <Input inputMode="decimal" value={v[k]} onChange={e => set(k, e.target.value)} aria-describedby={`${k}-src`} className={cx(flag && 'border-[#E0B400] bg-[#FFFBEA]')} />
                  <span id={`${k}-src`} className="text-[11px] font-normal">{!m ? <span className="text-faint">Not in the screenshot</span> : flag ? <Pill tone="warn">Check this</Pill> : <span className="text-muted">Read “{m.text}”</span>}</span>
                </Field>); })}
          </div>
          {err && <p role="alert" className="text-[13px] font-semibold text-danger">{err}</p>}
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <Btn type="submit" variant="primary" disabled={pending}>Confirm and save</Btn>
            <Btn type="button" onClick={onClose}>Cancel</Btn>
            <span className="text-[12px] text-muted">Saved as “From your screenshot”, with the period you choose.</span>
          </div>
        </form>
      )}
    </Modal>
  );
}
