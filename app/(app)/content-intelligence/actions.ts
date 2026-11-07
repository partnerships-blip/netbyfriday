'use server';
// Content Intelligence server actions. The workspace always comes from the session; RLS enforces it again in the database.
// Uploads go straight from the browser to private storage with a one-time signed URL issued here, after the type and size
// are checked; the file is then verified on the server (real size and type from storage) before it's recorded.
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { flag } from '@/lib/flags';
import { requireWritable, friendlyError, UserError } from '@/lib/auth';
import { ContentSchema, SnapshotSchema, checkUpload, extFor, sniffMatches, type AssetKind } from '@/lib/content/model';
import { limits, workspaceBytes } from '@/lib/content/server';
import type { ActionResult } from '@/lib/types';
import { getProvider, AIUnavailable } from '@/lib/ai/provider';
import { underAILimit, recordAI } from '@/lib/ai/ratelimit';
import { INSIGHTS_SYSTEM, toExtraction, type Extraction } from '@/lib/content/extract';

const uuid = z.string().uuid();

async function firstBytes(url: string, n: number): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { headers: { range: `bytes=0-${n - 1}` }, signal: AbortSignal.timeout(10_000), cache: 'no-store' });
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader(); const { value } = await reader.read(); await reader.cancel().catch(() => {});
    return value ? value.slice(0, n) : null;
  } catch { return null; }
}
const on = () => { if (!flag('contentIntel')) throw new UserError('Content Intelligence isn’t turned on yet.'); };
const ok = <T = any,>(r: { error: any; data?: any }): T => { if (r.error) throw r.error; return r.data as T; };
const row = (v: z.infer<typeof ContentSchema>) => ({ title: v.title, platform: v.platform, format: v.format, url: v.url, published_on: v.publishedOn, category: v.category,
  goal: v.goal, caption: v.caption, description: v.description, transcript: v.transcript, duration_seconds: v.durationSeconds == null ? null : Math.round(v.durationSeconds) });

async function owned(c: Awaited<ReturnType<typeof requireWritable>>, contentId: string) {
  const { data, error } = await c.sb.from('content_items').select('id').eq('workspace_id', c.ws.id).eq('id', uuid.parse(contentId)).maybeSingle();
  if (error) throw error; if (!data) throw new UserError('That content item no longer exists.');
}

export async function createContent(raw: unknown): Promise<ActionResult & { id?: string }> {
  try {
    on(); const v = ContentSchema.parse(raw); const c = await requireWritable();
    const d = ok<{ id: string }>(await c.sb.from('content_items').insert({ workspace_id: c.ws.id, ...row(v) }).select('id').single());
    revalidatePath('/content-intelligence');
    return { ok: true, id: d.id, message: 'Added to your library' };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function updateContent(raw: unknown): Promise<ActionResult> {
  try {
    on(); const id = uuid.parse((raw as any)?.id); const v = ContentSchema.parse(raw); const c = await requireWritable();
    await owned(c, id);
    ok(await c.sb.from('content_items').update(row(v)).eq('id', id).eq('workspace_id', c.ws.id));
    revalidatePath(`/content-intelligence/${id}`); revalidatePath('/content-intelligence');
    return { ok: true, message: 'Saved' };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

/** Deletes the item, every file stored for it, and (by cascade) its snapshots, reports, conversations and links. */
export async function deleteContent(id: string): Promise<ActionResult> {
  try {
    on(); const c = await requireWritable(); await owned(c, id);
    const assets = ok<{ path: string }[]>(await c.sb.from('content_assets').select('path').eq('content_id', id));
    if (assets?.length) { const { error } = await c.sb.storage.from('content').remove(assets.map(a => a.path)); if (error) throw error; }
    ok(await c.sb.from('content_items').delete().eq('id', id).eq('workspace_id', c.ws.id));
    revalidatePath('/content-intelligence');
    return { ok: true, message: 'Deleted, including its files and analyses' };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

/** A new measurement. Earlier measurements are kept; nothing is overwritten. */
export async function addSnapshot(raw: unknown): Promise<ActionResult & { id?: string }> {
  try {
    on(); const v = SnapshotSchema.parse(raw); const c = await requireWritable(); await owned(c, v.contentId);
    if (v.insightAssetId) { const a = ok<any>(await c.sb.from('content_assets').select('id').eq('id', v.insightAssetId).eq('content_id', v.contentId).eq('kind', 'insight').maybeSingle()); if (!a) throw new UserError('That screenshot no longer exists.'); }
    const d = ok<{ id: string }>(await c.sb.from('content_snapshots').insert({ workspace_id: c.ws.id, content_id: v.contentId, measured_on: v.measuredOn, period: v.period, period_note: v.periodNote,
      views: v.views, reach: v.reach, likes: v.likes, comments: v.comments, shares: v.shares, saves: v.saves, profile_visits: v.profileVisits, link_clicks: v.linkClicks, leads: v.leads,
      avg_watch_seconds: v.avgWatchSeconds, skip_rate: v.skipRate, retention_pct: v.retentionPct, source: v.source, insight_asset_id: v.insightAssetId ?? null }).select('id').single());
    revalidatePath(`/content-intelligence/${v.contentId}`); revalidatePath('/content-intelligence');
    return { ok: true, id: d.id, message: 'Metrics saved' };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function deleteSnapshot(id: string): Promise<ActionResult> {
  try {
    on(); const c = await requireWritable();
    const s = ok<any>(await c.sb.from('content_snapshots').select('content_id').eq('id', uuid.parse(id)).eq('workspace_id', c.ws.id).maybeSingle());
    if (!s) throw new UserError('Those metrics were already removed.');
    ok(await c.sb.from('content_snapshots').delete().eq('id', id).eq('workspace_id', c.ws.id));
    revalidatePath(`/content-intelligence/${s.content_id}`);
    return { ok: true, message: 'Metrics removed' };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

const Prepare = z.object({ contentId: uuid, kind: z.enum(['media', 'frame', 'insight']), mime: z.string().max(60), bytes: z.number().int().positive(), durationSeconds: z.number().min(0).max(36000).optional() });

/** Checks the file before upload and issues a one-time signed upload URL for a path inside this workspace. */
export async function prepareUpload(raw: unknown): Promise<ActionResult & { path?: string; token?: string }> {
  try {
    on(); const v = Prepare.parse(raw); const c = await requireWritable(); await owned(c, v.contentId);
    const L = limits();
    const bad = checkUpload(v.kind as AssetKind, v.mime, v.bytes, L); if (bad) throw new UserError(bad);
    if (v.kind === 'media' && v.mime.startsWith('video/') && v.durationSeconds && v.durationSeconds > L.videoSeconds + 1)
      throw new UserError(`Videos can be up to ${Math.round(L.videoSeconds / 60)} minutes during the beta. Trim it and upload again.`);
    if (v.kind !== 'media') {
      const { count, error } = await c.sb.from('content_assets').select('id', { count: 'exact', head: true }).eq('content_id', v.contentId).eq('kind', v.kind);
      if (error) throw error;
      const max = v.kind === 'frame' ? L.framesPerVideo : L.insightsPerItem;
      if ((count ?? 0) >= max) throw new UserError(v.kind === 'insight' ? `Up to ${max} screenshots per item. Remove one first.` : 'This video already has its frames.');
    }
    if ((await workspaceBytes(c)) + v.bytes > L.workspaceBytes) throw new UserError('Your content storage is full for the beta. Delete files you no longer need, or tell us through Feedback.');
    const path = `${c.ws.id}/${v.contentId}/${v.kind}-${randomUUID()}.${extFor(v.mime)}`;
    const { data, error } = await c.sb.storage.from('content').createSignedUploadUrl(path);
    if (error) throw error;
    return { ok: true, path, token: data.token };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

const Confirm = z.object({ contentId: uuid, path: z.string().max(300), kind: z.enum(['media', 'frame', 'insight']), frameAt: z.number().min(0).max(36000).optional(), durationSeconds: z.number().min(0).max(36000).optional() });

/** Records an uploaded file after checking what actually arrived in storage. A file that fails the checks is deleted. */
export async function confirmUpload(raw: unknown): Promise<ActionResult & { id?: string }> {
  try {
    on(); const v = Confirm.parse(raw); const c = await requireWritable(); await owned(c, v.contentId);
    const dir = `${c.ws.id}/${v.contentId}`, name = v.path.slice(dir.length + 1);
    if (!v.path.startsWith(dir + '/') || !new RegExp(`^${v.kind}-[0-9a-f-]{36}\\.(mp4|mov|jpg|png|webp)$`).test(name)) throw new UserError('That upload doesn’t belong to this item.');
    const { data: found, error } = await c.sb.storage.from('content').list(dir, { search: name, limit: 5 });
    if (error) throw error;
    const obj = (found ?? []).find((o: any) => o.name === name);
    if (!obj) throw new UserError('The upload didn’t finish. Try again.');
    const bytes = Number(obj.metadata?.size ?? 0), mime = String(obj.metadata?.mimetype ?? '');
    const bad = checkUpload(v.kind as AssetKind, mime, bytes, limits()) ?? (extFor(mime) !== name.split('.').pop() ? 'The file type doesn’t match its contents.' : null);
    let problem = bad;
    if (!problem) {   // read only the first bytes and compare them with the declared type
      const { data: su } = await c.sb.storage.from('content').createSignedUrl(v.path, 60);
      const head = su?.signedUrl ? await firstBytes(su.signedUrl, 32) : null;
      if (!head || !sniffMatches(mime, head)) problem = 'That file isn’t a real video or image of the type it claims to be.';
    }
    if (problem) { await c.sb.storage.from('content').remove([v.path]); throw new UserError(problem); }

    // One original per item: a new upload replaces the previous one and its frames.
    if (v.kind === 'media') {
      const old = ok<{ id: string; path: string }[]>(await c.sb.from('content_assets').select('id,path').eq('content_id', v.contentId).in('kind', ['media', 'frame']));
      if (old?.length) { await c.sb.storage.from('content').remove(old.map(o => o.path)); ok(await c.sb.from('content_assets').delete().in('id', old.map(o => o.id))); }
      if (v.durationSeconds) ok(await c.sb.from('content_items').update({ duration_seconds: Math.round(v.durationSeconds) }).eq('id', v.contentId));
    }
    const d = ok<{ id: string }>(await c.sb.from('content_assets').insert({ workspace_id: c.ws.id, content_id: v.contentId, kind: v.kind, path: v.path, mime, bytes,
      frame_at_seconds: v.kind === 'frame' ? v.frameAt ?? null : null }).select('id').single());
    revalidatePath(`/content-intelligence/${v.contentId}`);
    return { ok: true, id: d.id };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function deleteAsset(id: string): Promise<ActionResult> {
  try {
    on(); const c = await requireWritable();
    const a = ok<any>(await c.sb.from('content_assets').select('id,path,kind,content_id').eq('id', uuid.parse(id)).eq('workspace_id', c.ws.id).maybeSingle());
    if (!a) throw new UserError('That file was already removed.');
    // Removing the original also removes the frames taken from it.
    const rows = a.kind === 'media' ? ok<any[]>(await c.sb.from('content_assets').select('id,path').eq('content_id', a.content_id).in('kind', ['media', 'frame'])) : [a];
    const { error } = await c.sb.storage.from('content').remove(rows.map(r => r.path)); if (error) throw error;
    ok(await c.sb.from('content_assets').delete().in('id', rows.map(r => r.id)));
    revalidatePath(`/content-intelligence/${a.content_id}`); revalidatePath('/content-intelligence');
    return { ok: true, message: 'File deleted' };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

/** Reads the metrics visible in an insights screenshot and returns them as proposals for the creator to check.
 *  Cached on the asset: asking again returns the same reading without another AI call. Nothing is saved as a metric here. */
export async function extractInsights(assetId: string, again = false): Promise<ActionResult & { extraction?: Extraction }> {
  try {
    on(); const c = await requireWritable();
    const a = ok<any>(await c.sb.from('content_assets').select('id,path,mime,bytes,kind,extraction').eq('id', uuid.parse(assetId)).eq('workspace_id', c.ws.id).maybeSingle());
    if (!a || a.kind !== 'insight') throw new UserError('That screenshot no longer exists.');
    if (a.extraction && !again) return { ok: true, extraction: a.extraction };
    if (Number(a.bytes) > 4.5 * 1024 * 1024) throw new UserError('That screenshot is too large to read. Take a new one, or enter the numbers by hand.');
    if (!(await underAILimit(c.sb, c.user.id))) throw new UserError('You’ve reached this hour’s limit for AI requests. Try again later, or enter the numbers by hand.');
    const { data: file, error } = await c.sb.storage.from('content').download(a.path);
    if (error || !file) throw new UserError('The screenshot couldn’t be opened. Upload it again.');
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
    let r;
    try { r = await getProvider().readImages({ system: INSIGHTS_SYSTEM, instruction: 'Transcribe the analytics in this screenshot.', images: [{ mime: a.mime, base64 }], maxTokens: 900 }); }
    catch (e) { if (e instanceof AIUnavailable) throw new UserError('Reading screenshots isn’t available right now. Enter the numbers by hand.'); throw e; }
    await recordAI(c.sb, c.user.id, 'content', r);
    const extraction = toExtraction(r.text);
    ok(await c.sb.from('content_assets').update({ extraction, extracted_at: new Date().toISOString() }).eq('id', a.id));
    return { ok: true, extraction };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}
