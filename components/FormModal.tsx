'use client';
import { useState } from 'react';
import { Modal } from './Modal';
import { Btn, Field, Input, Select, Textarea } from './ui';
import { useAction } from './Toaster';
import type { ActionResult } from '@/lib/types';

export type FieldSpec = { name: string; label: string; type?: 'text' | 'email' | 'date' | 'money' | 'number' | 'select' | 'area' | 'checkbox'; required?: boolean; options?: (string | { v: string; l: string })[]; placeholder?: string; full?: boolean };

/** Generic form modal. Validation happens on the server (zod); errors come back as a message. */
export function FormModal({ open, onClose, title, note, fields, initial = {}, submitLabel, action }: {
  open: boolean; onClose: () => void; title: string; note?: string; fields: FieldSpec[]; initial?: Record<string, any>; submitLabel: string; action: (values: Record<string, any>) => Promise<ActionResult>;
}) {
  const [values, setValues] = useState<Record<string, any>>(initial);
  const [err, setErr] = useState('');
  const [pending, run] = useAction();
  const set = (k: string, v: any) => { setValues(s => ({ ...s, [k]: v })); setErr(''); };
  const submit = () => {
    const miss = fields.find(f => f.required && !String(values[f.name] ?? '').trim());
    if (miss) return setErr(`${miss.label} is required.`);
    run(async () => { const r = await action(values); if (!r.ok) setErr(r.error); return r; }, () => onClose());
  };
  return (
    <Modal open={open} onClose={onClose}>
      <form className="flex flex-col gap-3.5" onSubmit={e => { e.preventDefault(); submit(); }}>
        <h2 className="font-head text-[28px] leading-tight">{title}</h2>
        {note && <p className="text-[13px] leading-relaxed text-sub">{note}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map(f => {
            const v = values[f.name] ?? '';
            const label = f.label + (f.required ? ' *' : '');
            const full = f.full || f.type === 'area';
            if (f.type === 'checkbox') return <label key={f.name} className="flex items-center gap-2 text-[13px] sm:col-span-2"><input type="checkbox" checked={!!values[f.name]} onChange={e => set(f.name, e.target.checked)} />{f.label}</label>;
            return (
              <Field key={f.name} label={label} className={full ? 'sm:col-span-2' : ''}>
                {f.type === 'select' ? (
                  <Select value={v} onChange={e => set(f.name, e.target.value)}>{(f.options ?? []).map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>)}</Select>
                ) : f.type === 'area' ? (
                  <Textarea value={v} onChange={e => set(f.name, e.target.value)} placeholder={f.placeholder} />
                ) : (
                  <Input type={f.type === 'money' || f.type === 'number' ? 'text' : f.type ?? 'text'} inputMode={f.type === 'money' ? 'decimal' : f.type === 'number' ? 'numeric' : undefined} value={v} placeholder={f.placeholder ?? (f.type === 'money' ? '0.00' : undefined)} onChange={e => set(f.name, e.target.value)} />
                )}
              </Field>
            );
          })}
        </div>
        {err && <p role="alert" className="text-[13px] text-danger">{err}</p>}
        <div className="flex gap-2">
          <Btn variant="primary" type="submit" disabled={pending}>{pending ? 'Saving…' : submitLabel}</Btn>
          <Btn type="button" onClick={onClose}>Cancel</Btn>
        </div>
      </form>
    </Modal>
  );
}
