import { NextResponse } from 'next/server';
import { requireWorkspace } from '@/lib/auth';
import { flag } from '@/lib/flags';

/** Opens the original contract through a short-lived signed link. RLS hides other workspaces' contracts. */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!flag('contracts')) return new Response('Not found', { status: 404 });
  const { sb, ws } = await requireWorkspace();
  const { data: c } = await sb.from('contracts').select('storage_path').eq('id', params.id).eq('workspace_id', ws.id).maybeSingle();
  if (!c?.storage_path) return new Response('Not found', { status: 404 });
  const { data } = await sb.storage.from('attachments').createSignedUrl(c.storage_path, 300);
  if (!data?.signedUrl) return new Response('Not found', { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
