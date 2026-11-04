import { NextResponse } from 'next/server';
import { requireWorkspace } from '@/lib/auth';

/** Downloads every record in the signed-in user's workspace as JSON. */
export async function GET() {
  const { sb, ws, user } = await requireWorkspace();
  const tables = ['creator_profiles', 'brands', 'deals', 'deliverables', 'invoices', 'payments', 'income_entries', 'expenses', 'opportunities', 'audience_snapshots', 'content_categories', 'attachments', 'contacts', 'tasks'];
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), account: user.email, workspace: { brand_name: ws.brand_name, monthly_goal_cents: ws.monthly_goal_cents, annual_goal_cents: ws.annual_goal_cents } };
  for (const t of tables) { const { data, error } = await sb.from(t).select('*').eq('workspace_id', ws.id); if (error) return NextResponse.json({ error: 'Export failed.' }, { status: 500 }); out[t] = data; }
  return new NextResponse(JSON.stringify(out, null, 2), { headers: { 'content-type': 'application/json', 'content-disposition': `attachment; filename="netbyfriday-export-${new Date().toISOString().slice(0, 10)}.json"`, 'cache-control': 'no-store' } });
}
