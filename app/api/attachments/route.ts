import { NextResponse } from 'next/server';
import { requireWritable, friendlyError } from '@/lib/auth';

const ALLOWED: Record<string, string> = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx', 'text/plain': 'txt', 'text/csv': 'csv' };
const MAX = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const { sb, ws } = await requireWritable();
    const form = await req.formData();
    const file = form.get('file'), dealId = String(form.get('dealId') ?? '');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No file.' }, { status: 400 });
    if (!ALLOWED[file.type]) return NextResponse.json({ error: 'That file type is not allowed.' }, { status: 400 });
    if (file.size <= 0 || file.size > MAX) return NextResponse.json({ error: 'Files must be under 10 MB.' }, { status: 400 });
    // The deal must belong to this workspace (RLS hides it otherwise).
    const { data: deal } = await sb.from('deals').select('id').eq('id', dealId).eq('workspace_id', ws.id).maybeSingle();
    if (!deal) return NextResponse.json({ error: 'Partnership not found.' }, { status: 404 });
    const safe = file.name.replace(/[^\w.\- ]+/g, '_').slice(-120);
    const path = `${ws.id}/${deal.id}/${crypto.randomUUID()}.${ALLOWED[file.type]}`;
    const up = await sb.storage.from('attachments').upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) throw up.error;
    const { error } = await sb.from('attachments').insert({ workspace_id: ws.id, deal_id: deal.id, storage_path: path, file_name: safe, mime_type: file.type, size_bytes: file.size });
    if (error) { await sb.storage.from('attachments').remove([path]); throw error; }
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: friendlyError(e) }, { status: 400 }); }
}
