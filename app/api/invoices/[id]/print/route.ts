import { loadApp } from '@/lib/data/load';
import { formatCentsExact } from '@/lib/finance/core.js';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Printable invoice (use the browser's Save as PDF). All user text is HTML-escaped; the page runs no user-supplied script. */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const app = await loadApp();
  const v = app.metrics.invoices.find((x: any) => x.id === params.id);
  if (!v) return new Response('Not found', { status: 404 });
  const p = app.profile;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(v.number)}</title><style>body{font:14px/1.5 Helvetica,Arial,sans-serif;color:#1C1B19;padding:56px;max-width:720px;margin:auto}h1{font-weight:400;font-size:36px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:32px}td,th{text-align:left;padding:10px 0;border-bottom:1px solid #E7E3DA}th{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6B665E}.r{text-align:right}.m{color:#6B665E}@media print{.np{display:none}}</style></head><body>
<p class="np m">Use your browser's Print → Save as PDF.</p>
<h1>Invoice</h1><div class="m">${esc(v.number)} · Issued ${esc(v.issuedOn)} · Due ${esc(v.dueOn)} · ${esc(v.terms)}</div>
<p style="margin-top:32px"><b>From</b><br>${esc(p.businessName || p.displayName || '[Your business]')}<br>${esc(p.location)}</p><p><b>Bill to</b><br>${esc(v.clientName)}</p>
<table><tr><th>Description</th><th class="r">Amount</th></tr><tr><td>${esc(v.description || 'Creative services')}</td><td class="r">${formatCentsExact(v.amountCents)}</td></tr>
<tr><td class="m">Payments received</td><td class="r m">−${formatCentsExact(v.paidCents)}</td></tr><tr><td><b>Balance due</b></td><td class="r"><b>${formatCentsExact(v.balanceCents)}</b></td></tr></table>
${app.demo ? '<p class="m" style="margin-top:32px">DEMO · fictional data</p>' : ''}</body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'", 'x-content-type-options': 'nosniff', 'cache-control': 'private, no-store' } });
}
