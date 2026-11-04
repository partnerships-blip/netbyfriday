/** RFC 4180 CSV parser: quoted fields, escaped quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', i = 0, q = false;
  const s = text.replace(/^\uFEFF/, '');
  while (i < s.length) {
    const ch = s[i];
    if (q) {
      if (ch === '"') { if (s[i + 1] === '"') { field += '"'; i += 2; continue; } q = false; i++; continue; }
      field += ch; i++; continue;
    }
    if (ch === '"') { q = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += ch; i++;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

const STAGE_ALIASES: Record<string, string> = {
  lead: 'lead', 'new inquiry': 'lead', inquiry: 'lead', pitching: 'pitching', negotiating: 'negotiating', 'contract sent': 'negotiating', contracted: 'contracted', confirmed: 'contracted',
  'in progress': 'in_progress', 'content submitted': 'in_progress', completed: 'completed', paid: 'paid', lost: 'lost', declined: 'lost', 'lost / declined': 'lost'
};

/** Maps a parsed CSV (header row first) to partnership rows. Unknown columns are ignored. */
export function csvToDealRows(rows: string[][]) {
  if (!rows.length) return { rows: [], error: 'The file is empty.' };
  const header = rows[0].map(h => h.trim().toLowerCase());
  const at = (k: string) => header.indexOf(k);
  if (at('brand') < 0) return { rows: [], error: 'The CSV needs a "brand" column. Optional: campaign, fee, stage, date.' };
  const out = rows.slice(1).map(r => ({
    brand: (r[at('brand')] ?? '').trim(),
    campaign: at('campaign') >= 0 ? (r[at('campaign')] ?? '').trim() : '',
    fee: at('fee') >= 0 ? (r[at('fee')] ?? '').trim() : '',
    stage: at('stage') >= 0 ? STAGE_ALIASES[(r[at('stage')] ?? '').trim().toLowerCase()] ?? 'paid' : 'paid',
    date: at('date') >= 0 && /^\d{4}-\d{2}-\d{2}$/.test((r[at('date')] ?? '').trim()) ? r[at('date')].trim() : undefined
  })).filter(r => r.brand);
  return { rows: out, error: out.length ? '' : 'No rows with a brand name were found.' };
}
