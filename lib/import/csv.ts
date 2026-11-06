// CSV import: parsing, column mapping, validation and duplicate keys. Pure functions, shared by the browser
// (preview) and the server action (which re-validates everything; the browser is never trusted).
import { parseMoneyToCents } from '../finance/core.js';

export type ImportKind = 'deals' | 'contacts';
export const MAX_ROWS = 1000;
export const MAX_BYTES = 2_000_000;

/** RFC 4180 CSV: quoted fields, escaped quotes, commas and newlines inside quotes, CRLF. Also accepts tabs or semicolons if that is the file's separator. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const first = src.split(/\r?\n/, 1)[0] ?? '';
  const count = (ch: string) => first.split(ch).length - 1;
  const sep = count('\t') > count(',') ? '\t' : count(';') > count(',') ? ';' : ',';
  const rows: string[][] = []; let row: string[] = []; let field = ''; let q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"') { if (src[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += ch;
    } else if (ch === '"' && field === '') q = true;
    else if (ch === sep) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && src[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.map(r => r.map(c => c.trim())).filter(r => r.some(c => c !== ''));
}

type FieldDef = { key: string; label: string; required?: boolean; hints: string[] };
export const FIELDS: Record<ImportKind, FieldDef[]> = {
  deals: [
    { key: 'brand', label: 'Brand', required: true, hints: ['brand', 'brand name', 'company', 'client', 'sponsor', 'partner'] },
    { key: 'campaign', label: 'Campaign', hints: ['campaign', 'project', 'deal', 'deal name', 'title'] },
    { key: 'fee', label: 'Fee ($)', hints: ['fee', 'rate', 'amount', 'price', 'value', 'budget', 'total', 'deal value'] },
    { key: 'stage', label: 'Stage', hints: ['stage', 'status', 'pipeline'] },
    { key: 'contactName', label: 'Contact name', hints: ['contact', 'contact name', 'point of contact', 'poc', 'manager'] },
    { key: 'contactEmail', label: 'Contact email', hints: ['email', 'contact email', 'e-mail'] },
    { key: 'startedOn', label: 'Start date', hints: ['date', 'start', 'start date', 'created', 'inquiry date', 'date added'] },
    { key: 'paymentTerms', label: 'Payment terms', hints: ['terms', 'payment terms', 'net'] },
    { key: 'notes', label: 'Notes', hints: ['notes', 'note', 'comments', 'details', 'description'] }
  ],
  contacts: [
    { key: 'name', label: 'Name', required: true, hints: ['name', 'full name', 'contact', 'contact name', 'person'] },
    { key: 'email', label: 'Email', hints: ['email', 'e-mail', 'email address'] },
    { key: 'brand', label: 'Brand or agency', hints: ['brand', 'company', 'agency', 'organization', 'org'] },
    { key: 'role', label: 'Role', hints: ['role', 'title', 'job title', 'position'] },
    { key: 'phone', label: 'Phone', hints: ['phone', 'phone number', 'mobile', 'cell'] },
    { key: 'notes', label: 'Notes', hints: ['notes', 'note', 'comments'] }
  ]
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Guesses which column holds each field from the header names. Each column is used once; exact matches win. */
export function guessMapping(kind: ImportKind, headers: string[]): Record<string, number | null> {
  const h = headers.map(norm); const used = new Set<number>(); const out: Record<string, number | null> = {};
  for (const pass of ['exact', 'partial'] as const) for (const f of FIELDS[kind]) {
    if (out[f.key] != null) continue;
    const i = h.findIndex((x, j) => !used.has(j) && f.hints.some(hint => pass === 'exact' ? x === hint : x.includes(hint)));
    if (i >= 0) { out[f.key] = i; used.add(i); }
  }
  for (const f of FIELDS[kind]) if (!(f.key in out)) out[f.key] = null;
  return out;
}

const STAGES: [RegExp, string][] = [
  [/^(lead|new|inquiry|new inquiry|inbound|prospect)$/, 'lead'], [/^(pitch|pitching|pitched|outreach|reached out)$/, 'pitching'],
  [/^(negotiat|negotiating|negotiation|contract sent|proposal|in talks)/, 'negotiating'], [/^(contracted|confirmed|signed|booked|won|closed won)$/, 'contracted'],
  [/^(in progress|in production|active|creating|filming)$/, 'in_progress'], [/^(completed|complete|done|delivered|posted|live|invoiced)$/, 'completed'],
  [/^(paid|payment received)$/, 'paid'], [/^(lost|declined|passed|closed lost|cancelled|canceled|dead)$/, 'lost']
];
export function parseStage(v: string): string | null {
  const t = norm(v); if (!t) return 'lead';
  for (const [re, s] of STAGES) if (re.test(t)) return s;
  return null;
}

/** Accepts 2026-03-14, 3/14/2026, 03/14/26 and 14 Mar 2026 / March 14, 2026. US order for slashes. Returns null if not a real date. */
export function parseDate(v: string): string | null {
  const t = v.trim(); if (!t) return null;
  let y: number, m: number, d: number;
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  let r: RegExpMatchArray | null;
  if ((r = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [y, m, d] = [+r[1], +r[2], +r[3]];
  else if ((r = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/))) [m, d, y] = [+r[1], +r[2], r[3].length === 2 ? 2000 + +r[3] : +r[3]];
  else if ((r = t.match(/^([A-Za-z]{3,9})\.? (\d{1,2}),? (\d{4})$/)) && MONTHS.indexOf(r[1].slice(0, 3).toLowerCase()) >= 0) [m, d, y] = [MONTHS.indexOf(r[1].slice(0, 3).toLowerCase()) + 1, +r[2], +r[3]];
  else if ((r = t.match(/^(\d{1,2}) ([A-Za-z]{3,9})\.?,? (\d{4})$/)) && MONTHS.indexOf(r[2].slice(0, 3).toLowerCase()) >= 0) [d, m, y] = [+r[1], MONTHS.indexOf(r[2].slice(0, 3).toLowerCase()) + 1, +r[3]];
  else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (y < 2000 || y > 2100 || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cap = (s: string, n: number) => s.slice(0, n);

export type DealRow = { brand: string; campaign: string; feeCents: number; stage: string; contactName: string; contactEmail: string; startedOn: string | null; paymentTerms: string; notes: string };
export type ContactRow = { name: string; email: string; brand: string; role: string; phone: string; notes: string };
export type Checked<T> = { line: number; value: T | null; errors: string[]; warnings: string[]; duplicate: '' | 'existing' | 'file' };

/** Validates one mapped row. Errors block the row; warnings import it with a note. */
export function checkRow(kind: ImportKind, cells: string[], map: Record<string, number | null>, line: number): Checked<DealRow | ContactRow> {
  const get = (k: string) => { const i = map[k]; return i == null ? '' : (cells[i] ?? '').trim(); };
  const errors: string[] = [], warnings: string[] = [];
  if (kind === 'deals') {
    const brand = get('brand');
    if (!brand) errors.push('Brand is empty');
    const feeRaw = get('fee'); let feeCents = 0;
    if (feeRaw) { const c = parseMoneyToCents(feeRaw.replace(/\s*(usd|us\$)\s*/i, '')); if (c == null) errors.push(`Fee “${cap(feeRaw, 30)}” isn’t an amount`); else feeCents = c; }
    const stageRaw = get('stage'); const stage = parseStage(stageRaw) ?? 'lead';
    if (stageRaw && parseStage(stageRaw) == null) warnings.push(`Stage “${cap(stageRaw, 30)}” not recognised, imported as Lead`);
    if (stage === 'paid') warnings.push('Marked Paid: no payment is recorded. Record what you received so revenue stays accurate');
    const dateRaw = get('startedOn'); const startedOn = parseDate(dateRaw);
    if (dateRaw && !startedOn) warnings.push(`Date “${cap(dateRaw, 30)}” not recognised, today’s date used`);
    const email = get('contactEmail');
    if (email && !EMAIL.test(email)) warnings.push(`Email “${cap(email, 40)}” looks wrong, left out`);
    if (brand.length > 120) errors.push('Brand is longer than 120 characters');
    return { line, errors, warnings, duplicate: '', value: errors.length ? null : {
      brand, campaign: cap(get('campaign'), 200), feeCents, stage, contactName: cap(get('contactName'), 120), contactEmail: email && EMAIL.test(email) ? cap(email, 254) : '',
      startedOn, paymentTerms: cap(get('paymentTerms'), 200), notes: cap(get('notes'), 10000) } };
  }
  const name = get('name');
  if (!name) errors.push('Name is empty');
  if (name.length > 120) errors.push('Name is longer than 120 characters');
  const email = get('email');
  if (email && !EMAIL.test(email)) warnings.push(`Email “${cap(email, 40)}” looks wrong, left out`);
  return { line, errors, warnings, duplicate: '', value: errors.length ? null : {
    name, email: email && EMAIL.test(email) ? cap(email, 254) : '', brand: cap(get('brand'), 120), role: cap(get('role'), 120), phone: cap(get('phone'), 40), notes: cap(get('notes'), 5000) } };
}

/** Duplicate key. Partnerships: brand + campaign (or brand + fee + date when there is no campaign). Contacts: email, else name + brand. */
export function dupKey(kind: ImportKind, v: any): string {
  if (kind === 'deals') return v.campaign ? `d|${norm(v.brand)}|${norm(v.campaign)}` : `d|${norm(v.brand)}||${v.feeCents}|${v.startedOn ?? ''}`;
  return v.email ? `c|@${v.email.toLowerCase()}` : `c|${norm(v.name)}|${norm(v.brand)}`;
}

/** Validates all rows and marks duplicates of existing records and of earlier rows in the same file. */
export function checkAll(kind: ImportKind, rows: string[][], map: Record<string, number | null>, existing: Set<string>) {
  const seen = new Set<string>();
  return rows.map((cells, i) => {
    const r = checkRow(kind, cells, map, i + 2);       // line 1 is the header
    if (r.value) { const k = dupKey(kind, r.value); if (existing.has(k)) r.duplicate = 'existing'; else if (seen.has(k)) r.duplicate = 'file'; seen.add(k); }
    return r;
  });
}
