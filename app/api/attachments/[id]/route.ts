import { NextResponse } from 'next/server';
import { requireWorkspace } from '@/lib/auth';

/** Redirects to a short-lived signed URL. RLS on both the table and the storage bucket limits this to the owner's files. */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { sb, ws } = await requireWorkspace();
  const { data: a } = await sb.from('attachments').select('storage_path,file_name').eq('id', params.id).eq('workspace_id', ws.id).maybeSingle();
  if (!a) return new NextResponse('Not found', { status: 404 });
  const { data } = await sb.storage.from('attachments').createSignedUrl(a.storage_path, 60, { download: a.file_name });
  if (!data?.signedUrl) return new NextResponse('Not found', { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { sb, ws } = await requireWorkspace();
  const { data: a } = await sb.from('attachments').select('storage_path').eq('id', params.id).eq('workspace_id', ws.id).maybeSingle();
  if (!a) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await sb.storage.from('attachments').remove([a.storage_path]);
  await sb.from('attachments').delete().eq('id', params.id).eq('workspace_id', ws.id);
  return NextResponse.json({ ok: true });
}
