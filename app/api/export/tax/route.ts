import { flag } from '@/lib/flags';
import { loadApp } from '@/lib/data/load';
import { buildLedger, formatCentsExact } from '@/lib/finance/core.js';
import { STREAM_LABEL } from '@/lib/brand';

// Spreadsheet cells starting with = + - @ can run as formulas; prefix them so they stay text.
const cell = (v: unknown) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/** One year of money in and money out, cash basis, as CSV for an accountant. */
export async function GET(req: Request) {
  if (!flag('taxes')) return new Response('Not found', { status: 404 });
  const app = await loadApp();
  const year = Number(new URL(req.url).searchParams.get('year')) || +app.metrics.today.slice(0, 4);
  const y = String(year), today = app.metrics.today;
  const rows: (string | number)[][] = [['Date', 'Type', 'Payer or category', 'Source', 'Description', 'Amount (USD)']];
  const invById = new Map(app.input.invoices.map(v => [v.id, v]));
  for (const e of buildLedger(app.input).entries) {
    if (e.date.slice(0, 4) !== y || e.date > today) continue;
    const inv = e.invoiceId ? invById.get(e.invoiceId) : undefined;
    rows.push([e.date, 'Income', e.counterparty || '', STREAM_LABEL[e.stream as keyof typeof STREAM_LABEL] ?? e.stream, inv ? `Payment on ${inv.number}` : 'Direct income', formatCentsExact(e.amountCents).replace(/[$,]/g, '')]);
  }
  for (const x of app.input.expenses) {
    if (x.spentOn.slice(0, 4) !== y || x.spentOn > today) continue;
    rows.push([x.spentOn, 'Expense', x.category, '', x.note ?? '', '-' + formatCentsExact(x.amountCents).replace(/[$,]/g, '')]);
  }
  const body = [rows[0], ...rows.slice(1).sort((a, b) => String(a[0]).localeCompare(String(b[0])))].map(r => r.map(cell).join(',')).join('\r\n');
  return new Response(body, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="netbyfriday-${year}-income-expenses.csv"`, 'cache-control': 'private, no-store' } });
}
