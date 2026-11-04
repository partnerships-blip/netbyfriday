import { NextResponse } from 'next/server';
import { requireWritable, friendlyError } from '@/lib/auth';

const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }; // no SVG: it can carry script

export async function POST(req: Request) {
  try {
    const { sb, ws } = await requireWritable();
    const file = (await req.formData()).get('file');
    if (!(file instanceof File) || !TYPES[file.type]) return NextResponse.json({ error: 'Use a PNG, JPG or WebP image.' }, { status: 400 });
    if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Logo must be under 2 MB.' }, { status: 400 });
    const path = `${ws.id}/logo-${crypto.randomUUID()}.${TYPES[file.type]}`;
    const up = await sb.storage.from('logos').upload(path, file, { contentType: file.type });
    if (up.error) throw up.error;
    if (ws.logo_path) await sb.storage.from('logos').remove([ws.logo_path]);
    const { error } = await sb.from('workspaces').update({ logo_path: path }).eq('id', ws.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: friendlyError(e) }, { status: 400 }); }
}

export async function DELETE() {
  try {
    const { sb, ws } = await requireWritable();
    if (ws.logo_path) await sb.storage.from('logos').remove([ws.logo_path]);
    await sb.from('workspaces').update({ logo_path: null }).eq('id', ws.id);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: friendlyError(e) }, { status: 400 }); }
}
