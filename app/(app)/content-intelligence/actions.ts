'use server';
// Content Intelligence server actions. The workspace always comes from the session; RLS enforces it again in the database.
// Uploads go straight from the browser to private storage with a one-time signed URL issued here, after the type and size
// are checked; the file is then verified on the server (real size and type from storage) before it's recorded.
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { contentIntelAllowed } from '@/lib/content/access';
import { requireWritable, friendlyError, UserError } from '@/lib/auth';
import { ContentSchema, SnapshotSchema, checkUpload, extFor, sniffMatches, type AssetKind } from '@/lib/content/model';
import { limits, workspaceBytes } from '@/lib/content/server';
import type { ActionResult } from '@/lib/types';
import { getProvider, AIUnavailable } from '@/lib/ai/provider';
import { underAILimit, recordAI } from '@/lib/ai/ratelimit';
import { INSIGHTS_SYSTEM, toExtraction, type Extraction } from '@/lib/content/extract';
import { createHash } from 'node:crypto';
import { PERIOD_LABEL, FORMAT_LABEL, PLATFORM_LABEL } from '@/lib/content/model';
import { comparableSet, compare, performanceFacts } from '@/lib/content/compare';
import { REPORT_SYSTEM, PROMPT_VERSION, verifyReport, standOut, numbersIn, type Source, type Mode } from '@/lib/content/report';
import { mapItem, mapSnapshot } from '@/lib/content/server';
import { FOLLOWUP_SYSTEM, verifyFollowUp, type FollowUp } from '@/lib/content/followup';
import { loadApp } from '@/lib/data/load';
import { impactFor, byCategory, type LinkRow } from '@/lib/content/business';
import { formatCents } from '@/lib/finance/core.js';

const uuid = z.string().uuid();

async function firstBytes(url: string, n: number): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { headers: { range: `bytes=0-${n - 1}` }, signal: AbortSignal.timeout(10_000), cache: 'no-store' });
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader(); const { value } = await reader.read(); await reader.cancel().catch(() => {});
    return value ? value.slice(0, n) : null;
  } catch { return null; }
}
const on = async () => { if (!(await contentIntelAllowed())) throw new UserError('Content Intelligence isn’t turned on yet.'); };
const ok = <T = any,>(r: { error: any; data?: any }): T => { if (r.error) throw r.error; return r.data as T; };
const row = (v: z.infer<typeof ContentSchema>) => ({ title: v.title, platform: v.platform, format: v.format, url: v.url, published_on: v.publishedOn, category: v.category,
  goal: v.goal, caption: v.caption, description: v.description, transcript: v.transcript, duration_seconds: v.durationSeconds == null ? null : Math.round(v.durationSeconds) });

async function owned(c: Awaited<ReturnType<typeof requireWritable>>, contentId: string) {
  const { data, error } = await c.sb.from('content_items').select('id').eq('workspace_id', c.ws.id).eq('id', uuid.parse(contentId)).maybeSingle();
  if (error) throw error; if (!data) throw new UserError('That content item no longer exists.');
}

export async function createContent(raw: unknown): Promise<ActionResult & { id?: string }> {
  try {
    await on(); const v = ContentSchema.parse(raw); const c = await requireWritable();
    const d = ok<{ id: string }>(await c.sb.from('content_items').insert({ workspace_id: c.ws.id, ...row(v) }).select('id').single());
    revalidatePath('/content-intelligence');
    return { ok: true, id: d.id, message: 'Added to your library' };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function updateContent(raw: unknown): Promise<ActionResult> {
  try {
    await on(); const id = uuid.parse((raw as any)?.id); const v = ContentSchema.parse(raw); const c = await requireWritable();
    await owned(c, id);
    ok(await c.sb.from('content_items').update(row(v)).eq('id', id).eq('workspace_id', c.ws.id));
    revalidatePath(`/content-intelligence/${id}`); revalidatePath('/content-intelligence');
    return { ok: true, message: 'Saved' };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

/** Deletes the item, every file stored for it, and (by cascade) its snapshots, reports, conversations and links. */
export async function deleteContent(id: string): Promise<ActionResult> {
  try {
    await on(); const c = await requireWritable(); await owned(c, id);
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
    await on(); const v = SnapshotSchema.parse(raw); const c = await requireWritable(); await owned(c, v.contentId);
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
    await on(); const c = await requireWritable();
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
    await on(); const v = Prepare.parse(raw); const c = await requireWritable(); await owned(c, v.contentId);
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
    await on(); const v = Confirm.parse(raw); const c = await requireWritable(); await owned(c, v.contentId);
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
    await on(); const c = await requireWritable();
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
    await on(); const c = await requireWritable();
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

const CHECKIN_TITLE: Record<string, string> = { '24h': '24-hour check-in', '48h': '48-hour check-in', '7d': '7-day check-in', '30d': '30-day check-in', lifetime: 'Lifetime check-in', custom: 'Check-in' };

/** Runs a Creative Review or a Performance Check-In. Identical inputs return the existing report (no new AI cost). */
export async function analyzeContent(raw: unknown): Promise<ActionResult & { reportId?: string; cached?: boolean }> {
  try {
    await on();
    const v = z.object({ contentId: uuid, mode: z.enum(['creative', 'performance', 'business']), snapshotId: uuid.optional() }).parse(raw);
    const c = await requireWritable();
    const itemRow = ok<any>(await c.sb.from('content_items').select('*').eq('workspace_id', c.ws.id).eq('id', v.contentId).maybeSingle());
    if (!itemRow) throw new UserError('That content item no longer exists.');
    const item = mapItem(itemRow);
    const assets = ok<any[]>(await c.sb.from('content_assets').select('id,kind,path,mime,frame_at_seconds').eq('content_id', item.id).in('kind', ['media', 'frame']).order('frame_at_seconds', { ascending: true, nullsFirst: true }));
    const media = assets.find(a => a.kind === 'media'); const frames = assets.filter(a => a.kind === 'frame');
    const image = media && media.mime.startsWith('image/') ? media : null;
    const text = (k: string, label: string, t: string): Source[] => t.trim() ? [{ ref: k, label, text: t.trim().slice(0, 4000), numbers: numbersIn(t) }] : [];
    const sources: Source[] = [
      ...frames.map((f, i) => ({ ref: `frame:${i + 1}`, label: `Frame at ${Number(f.frame_at_seconds)}s`, text: `Still frame at ${Number(f.frame_at_seconds)} seconds`, numbers: [Number(f.frame_at_seconds)] })),
      ...(image ? [{ ref: 'image', label: 'The image', text: 'The uploaded image', numbers: [] }] : []),
      ...text('title', 'Title', item.title), ...text('caption', 'Caption', item.caption), ...text('description', 'Your description', item.description),
      ...text('transcript', 'Voiceover / on-screen text', item.transcript), ...text('goal', 'Goal', item.goal), ...text('category', 'Category', item.category),
      ...(item.durationSeconds ? [{ ref: 'duration', label: 'Length', text: `${item.durationSeconds} seconds long`, numbers: [item.durationSeconds] }] : [])
    ];
    const autoLimits: string[] = [];
    if (v.mode === 'creative' && !frames.length && !image && !item.caption && !item.description && !item.transcript)
      throw new UserError('Add the video, an image, or at least the caption and what happens in it, so there’s something to review.');
    if (frames.length) autoLimits.push(`The review looked at ${frames.length} still frames (${frames.map(f => Number(f.frame_at_seconds) + 's').join(', ')}), not motion or sound.`);
    else if (media && media.mime.startsWith('video/')) autoLimits.push('Frames couldn’t be taken from this video in your browser, so visuals weren’t reviewed.');
    else if (!image) autoLimits.push('The original wasn’t uploaded, so only the text you provided was reviewed.');
    if (!item.transcript) autoLimits.push('No voiceover or on-screen text was added, so spoken words weren’t assessed. NETBYFRIDAY doesn’t transcribe audio.');

    let overview = null, snapshotId: string | null = null, hasMetrics = false, title = 'Creative review';
    if (v.mode === 'performance') {
      const snaps = ok<any[]>(await c.sb.from('content_snapshots').select('*').eq('workspace_id', c.ws.id)).map(r => ({ ...mapSnapshot(r), contentId: r.content_id }));
      const target = v.snapshotId ? snaps.find(s => s.id === v.snapshotId && s.contentId === item.id) : snaps.filter(s => s.contentId === item.id).sort((a, b) => (b.measuredOn + b.createdAt).localeCompare(a.measuredOn + a.createdAt))[0];
      if (!target) throw new UserError('Add this post’s numbers first (enter them or upload an insights screenshot).');
      const items = ok<any[]>(await c.sb.from('content_items').select('id,platform,format,title').eq('workspace_id', c.ws.id));
      const set = comparableSet({ id: item.id, platform: item.platform, format: item.format, title: item.title }, target.period, items, snaps);
      const comps = compare(target, set);
      const periodLabel = target.period === 'custom' ? (target.periodNote || 'custom period') : PERIOD_LABEL[target.period].toLowerCase();
      const facts = performanceFacts(target, periodLabel, comps, set.length, FORMAT_LABEL[item.format]);
      sources.push(...facts);
      overview = { lines: standOut(comps, target as any), comparisons: comps, periodLabel };
      snapshotId = target.id; hasMetrics = true;
      title = target.period === 'custom' ? `Check-in: ${target.periodNote}` : CHECKIN_TITLE[target.period];
      autoLimits.push(`Numbers are the ones you ${target.source === 'screenshot' ? 'confirmed from your screenshot' : 'entered'} (checked ${target.measuredOn}); they weren’t retrieved from ${PLATFORM_LABEL[item.platform]}.`);
      autoLimits.push('Patterns in numbers show what happened, not why. Treat explanations as ideas to test.');
    }

    if (v.mode === 'business') {
      title = 'Business impact';
      const app = await loadApp();
      const links: LinkRow[] = ok<any[]>(await c.sb.from('content_links').select('id,content_id,deal_id,income_id,note').eq('workspace_id', c.ws.id)).map(l => ({ id: l.id, contentId: l.content_id, dealId: l.deal_id, incomeId: l.income_id, note: l.note }));
      const imp = impactFor(item.id, links, app.input);
      if (!imp.deals.length && !imp.income.length) throw new UserError('Link this post to a partnership or income first. Business impact works from what you’ve linked.');
      const $ = (c: number) => formatCents(c);
      sources.push({ ref: 'b:summary', label: 'Linked to this post', text: `Linked by the creator: ${imp.deals.length} partnership${imp.deals.length === 1 ? '' : 's'} and ${imp.income.length} income entr${imp.income.length === 1 ? 'y' : 'ies'}. Agreed (contracted) fees: ${$(imp.contractedCents)}. Money received so far: ${$(imp.receivedCents)}.${imp.estimatedCents ? ` Estimated fees not yet agreed: ${$(imp.estimatedCents)}.` : ''}`, numbers: [] });
      imp.deals.forEach((d, i) => sources.push({ ref: `b:deal:${i + 1}`, label: d.label, text: `${d.label}: ${d.feeIsEstimate ? 'estimated fee' : 'agreed fee'} ${$(d.feeCents)}, stage ${d.stage}, received ${$(d.receivedCents)}`, numbers: [] }));
      imp.income.forEach((e, i) => sources.push({ ref: `b:income:${i + 1}`, label: e.label, text: `${e.label}: ${$(e.amountCents)} received on ${e.receivedOn}`, numbers: [] }));
      const items = ok<any[]>(await c.sb.from('content_items').select('id,category').eq('workspace_id', c.ws.id));
      const cats = byCategory(items, links, app.input).filter(r => r.deals || r.receivedCents).slice(0, 6);
      if (cats.length) sources.push({ ref: 'b:categories', label: 'Your content categories', text: cats.map(r => `${r.category}: ${r.posts} post${r.posts === 1 ? '' : 's'} in your library, ${r.deals} linked partnership${r.deals === 1 ? '' : 's'}, ${$(r.receivedCents)} received`).join('; '), numbers: [] });
      overview = { lines: [`${imp.deals.length} linked partnership${imp.deals.length === 1 ? '' : 's'}`, `${$(imp.contractedCents)} in agreed fees (contracted, not all received)`, `${$(imp.receivedCents)} received so far`, ...(imp.estimatedCents ? [`${$(imp.estimatedCents)} in estimates you haven’t agreed yet (not counted)`] : [])], comparisons: [], periodLabel: '' } as any;
      autoLimits.push('These are links you made. They show what this post is associated with in your records, not that it caused those deals or sales.');
      autoLimits.push('Received means payments and income you’ve recorded; agreed fees aren’t revenue until they’re paid.');
    }

    const hash = createHash('sha256').update(JSON.stringify({ PROMPT_VERSION, mode: v.mode, item: { ...item, updatedAt: undefined, createdAt: undefined }, assets: assets.map(a => a.id).sort(), snapshotId, sources: sources.map(s => [s.ref, s.text]) })).digest('hex');
    const cached = ok<any>(await c.sb.from('content_reports').select('id').eq('content_id', item.id).eq('mode', v.mode).eq('input_hash', hash).maybeSingle());
    if (cached) return { ok: true, reportId: cached.id, cached: true, message: 'Nothing has changed since the last analysis, so here it is again (no new AI use).' };

    if (!(await underAILimit(c.sb, c.user.id))) throw new UserError('You’ve reached this hour’s limit for AI requests. Try again later.');
    // Images: every frame for a creative review; the opening frames for a check-in (where the hook matters most).
    const pics = image ? [image] : v.mode === 'creative' ? frames : frames.slice(0, 4);
    const images: { mime: string; base64: string }[] = [];
    for (const a of pics) { const { data, error } = await c.sb.storage.from('content').download(a.path); if (error || !data) continue; images.push({ mime: a.mime, base64: Buffer.from(await data.arrayBuffer()).toString('base64') }); }
    const order = image ? 'The image is the uploaded content (ref "image").' : pics.length ? `Images, in order: ${pics.map((f, i) => `frame:${i + 1} at ${Number(f.frame_at_seconds)}s`).join(', ')}.` : 'No images were provided.';
    const instruction = `<content>${JSON.stringify({ platform: PLATFORM_LABEL[item.platform], format: FORMAT_LABEL[item.format], published: item.publishedOn })}</content>
<sources>${JSON.stringify(sources.map(s => ({ ref: s.ref, label: s.label, text: s.text })))}</sources>
${order}
Task: ${v.mode === 'creative' ? 'Write a Creative Review of this content. There are no performance numbers: do not comment on performance.' : v.mode === 'business' ? 'Write a Business Impact review: what this content is associated with in the creator’s records (b: refs), what that suggests about their positioning, how they could use it in pitches, and what to make more of. Distinguish agreed fees from money received. Never say the post caused a deal.' : `Write a ${title} using the facts provided. Interpret the calculated numbers; do not compute new ones.`}`;
    let r;
    try { r = await getProvider().readImages({ system: REPORT_SYSTEM, instruction, images, maxTokens: 2200 }); }
    catch (e) { if (e instanceof AIUnavailable) throw new UserError('Analysis isn’t available right now. Try again in a few minutes.'); throw e; }
    await recordAI(c.sb, c.user.id, 'content', r);
    if (r.stopReason === 'max_tokens') autoLimits.push('The analysis was cut short; some sections may be missing.');
    const report = verifyReport(r.text, sources, { mode: v.mode as Mode, title, hasMetrics, overview, autoLimits });
    if (!report.working.length && !report.improve.length && !report.recommendations.length) throw new UserError('The analysis didn’t produce anything that could be checked against your content. Try again, or add more detail (caption, what happens, voiceover).');
    report.sources = sources.map(x => ({ ...x, text: x.text.slice(0, 1500) }));
    const d = ok<{ id: string }>(await c.sb.from('content_reports').insert({ workspace_id: c.ws.id, content_id: item.id, mode: v.mode, snapshot_id: snapshotId, input_hash: hash, report, model: process.env.AI_MODEL ?? '' }).select('id').single());
    revalidatePath(`/content-intelligence/${item.id}`); revalidatePath('/content-intelligence');
    return { ok: true, reportId: d.id, message: 'Analysis ready' };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function saveReport(id: string, keep = true): Promise<ActionResult> {
  try {
    await on(); const c = await requireWritable();
    const r = ok<any>(await c.sb.from('content_reports').update({ saved_at: keep ? new Date().toISOString() : null }).eq('id', uuid.parse(id)).eq('workspace_id', c.ws.id).select('content_id').maybeSingle());
    if (!r) throw new UserError('That analysis no longer exists.');
    revalidatePath(`/content-intelligence/${r.content_id}`);
    return { ok: true, message: keep ? 'Saved to your workspace' : 'Removed from saved' };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function deleteReport(id: string): Promise<ActionResult> {
  try {
    await on(); const c = await requireWritable();
    const r = ok<any>(await c.sb.from('content_reports').delete().eq('id', uuid.parse(id)).eq('workspace_id', c.ws.id).select('content_id').maybeSingle());
    if (!r) throw new UserError('That analysis was already deleted.');
    revalidatePath(`/content-intelligence/${r.content_id}`);
    return { ok: true, message: 'Analysis deleted' };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

/** A follow-up question about an analysis. Uses the analysis, its sources, and the creator's other content of the same kind. */
export async function askAboutReport(raw: unknown): Promise<ActionResult & { reply?: FollowUp }> {
  try {
    await on();
    const v = z.object({ reportId: uuid, question: z.string().trim().min(2, 'Ask a question.').max(1000, 'Keep the question under 1,000 characters.') }).parse(raw);
    const c = await requireWritable();
    const rep = ok<any>(await c.sb.from('content_reports').select('*').eq('id', v.reportId).eq('workspace_id', c.ws.id).maybeSingle());
    if (!rep) throw new UserError('That analysis no longer exists.');
    const item = mapItem(ok<any>(await c.sb.from('content_items').select('*').eq('id', rep.content_id).single()));
    const report = rep.report;
    const sources: Source[] = Array.isArray(report.sources) ? report.sources : [
      ...(item.caption ? [{ ref: 'caption', label: 'Caption', text: item.caption, numbers: numbersIn(item.caption) }] : []),
      ...(item.description ? [{ ref: 'description', label: 'Your description', text: item.description, numbers: numbersIn(item.description) }] : [])];
    // The creator's other content of the same kind, with their latest numbers (for "compare with my last five Reels").
    const others = ok<any[]>(await c.sb.from('content_items').select('id,title,published_on').eq('workspace_id', c.ws.id).eq('platform', item.platform).eq('format', item.format).neq('id', item.id).order('published_on', { ascending: false, nullsFirst: false }).limit(8));
    if (others.length) {
      const snaps = ok<any[]>(await c.sb.from('content_snapshots').select('*').in('content_id', others.map(o => o.id)).order('measured_on', { ascending: false }));
      others.forEach((o, i) => {
        const s0 = snaps.find(x => x.content_id === o.id); if (!s0) return;
        const m = mapSnapshot(s0);
        const vals = ([['views', 'views'], ['shares', 'shares'], ['comments', 'comments'], ['saves', 'saves'], ['skipRate', 'skip rate %'], ['avgWatchSeconds', 'avg watch s']] as const).filter(([k]) => (m as any)[k] != null);
        sources.push({ ref: `h:${i + 1}`, label: `${o.title} (${PERIOD_LABEL[m.period as keyof typeof PERIOD_LABEL]})`, text: `${o.title}${o.published_on ? `, published ${o.published_on}` : ''}: ${vals.map(([k, l]) => `${(m as any)[k]} ${l}`).join(', ')} (${PERIOD_LABEL[m.period as keyof typeof PERIOD_LABEL]}, checked ${m.measuredOn})`, numbers: vals.map(([k]) => Number((m as any)[k])) });
      });
    }
    const history = ok<any[]>(await c.sb.from('content_messages').select('role,text').eq('report_id', rep.id).order('created_at', { ascending: false }).limit(6)).reverse();
    if (!(await underAILimit(c.sb, c.user.id))) throw new UserError('You’ve reached this hour’s limit for AI requests. Try again later.');
    const frames = ok<any[]>(await c.sb.from('content_assets').select('path,mime,frame_at_seconds').eq('content_id', item.id).in('kind', ['frame', 'media']).order('frame_at_seconds', { ascending: true, nullsFirst: true }));
    const pics = frames.filter(f => f.mime.startsWith('image/')).slice(0, 3);
    const images: { mime: string; base64: string }[] = [];
    for (const a of pics) { const { data } = await c.sb.storage.from('content').download(a.path); if (data) images.push({ mime: a.mime, base64: Buffer.from(await data.arrayBuffer()).toString('base64') }); }
    const brief = { title: report.title, summary: report.summary, standOut: report.overview?.lines ?? [], working: report.working?.map((p: any) => p.point), improve: report.improve?.map((p: any) => p.point), recommendations: report.recommendations?.map((p: any) => p.point) };
    const convo = history.map(h => `${h.role === 'user' ? 'Creator' : 'You'}: ${h.role === 'user' ? h.text : (() => { try { return JSON.parse(h.text).answer; } catch { return h.text; } })()}`).join('\n');
    const instruction = `<analysis>${JSON.stringify(brief)}</analysis>
<sources>${JSON.stringify(sources.map(s => ({ ref: s.ref, label: s.label, text: s.text })))}</sources>
${pics.length ? `Images, in order: the opening of the content (${pics.map((p, i) => p.frame_at_seconds != null ? `frame:${i + 1} at ${Number(p.frame_at_seconds)}s` : 'the image').join(', ')}).` : 'No images.'}
${convo ? `<conversation>\n${convo}\n</conversation>` : ''}
Question: ${v.question}`;
    let r;
    try { r = await getProvider().readImages({ system: FOLLOWUP_SYSTEM, instruction, images, maxTokens: 1400 }); }
    catch (e) { if (e instanceof AIUnavailable) throw new UserError('The assistant isn’t available right now. Try again in a few minutes.'); throw e; }
    await recordAI(c.sb, c.user.id, 'content', r);
    const reply = verifyFollowUp(r.text, sources);
    const stored = JSON.stringify(reply).slice(0, 7900);
    ok(await c.sb.from('content_messages').insert([{ workspace_id: c.ws.id, report_id: rep.id, role: 'user', text: v.question }, { workspace_id: c.ws.id, report_id: rep.id, role: 'assistant', text: stored }]));
    return { ok: true, reply };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

/** Saves a suggestion as a content idea (only when the creator clicks Save). */
export async function saveIdea(raw: unknown): Promise<ActionResult> {
  try {
    await on(); const v = z.object({ reportId: uuid, text: z.string().trim().min(1).max(1000) }).parse(raw); const c = await requireWritable();
    const rep = ok<any>(await c.sb.from('content_reports').select('id,content_id').eq('id', v.reportId).eq('workspace_id', c.ws.id).maybeSingle());
    if (!rep) throw new UserError('That analysis no longer exists.');
    ok(await c.sb.from('content_ideas').insert({ workspace_id: c.ws.id, content_id: rep.content_id, report_id: rep.id, text: v.text }));
    revalidatePath(`/content-intelligence/${rep.content_id}`);
    return { ok: true, message: 'Saved to your content ideas' };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

/** Turns a suggestion into a task (only when the creator clicks). Uses the normal tasks table; nothing else changes. */
export async function saveIdeaAsTask(raw: unknown): Promise<ActionResult> {
  try {
    await on(); const v = z.object({ reportId: uuid, text: z.string().trim().min(1).max(1000) }).parse(raw); const c = await requireWritable();
    const rep = ok<any>(await c.sb.from('content_reports').select('id,content_id').eq('id', v.reportId).eq('workspace_id', c.ws.id).maybeSingle());
    if (!rep) throw new UserError('That analysis no longer exists.');
    const item = ok<any>(await c.sb.from('content_items').select('title').eq('id', rep.content_id).single());
    const title = v.text.length > 190 ? v.text.slice(0, 187) + '…' : v.text;
    ok(await c.sb.from('tasks').insert({ workspace_id: c.ws.id, title, notes: `From the Content Intelligence analysis of “${item.title}”.\n\n${v.text}`.slice(0, 5000) }));
    revalidatePath('/tasks');
    return { ok: true, message: 'Added to your tasks' };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function setIdeaDone(id: string, done: boolean): Promise<ActionResult> {
  try {
    await on(); const c = await requireWritable();
    const r = ok<any>(await c.sb.from('content_ideas').update({ done }).eq('id', uuid.parse(id)).eq('workspace_id', c.ws.id).select('content_id').maybeSingle());
    if (!r) throw new UserError('That idea no longer exists.');
    revalidatePath(`/content-intelligence/${r.content_id}`);
    return { ok: true };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

/** Links this post to a partnership or an income entry the creator already has. A record, not a claim of cause. */
export async function linkContent(raw: unknown): Promise<ActionResult> {
  try {
    await on();
    const v = z.object({ contentId: uuid, dealId: uuid.optional(), incomeId: uuid.optional(), note: z.string().trim().max(200).default('') })
      .refine(x => !!x.dealId !== !!x.incomeId, 'Choose a partnership or an income entry.').parse(raw);
    const c = await requireWritable(); await owned(c, v.contentId);
    const { error } = await c.sb.from('content_links').insert({ workspace_id: c.ws.id, content_id: v.contentId, deal_id: v.dealId ?? null, income_id: v.incomeId ?? null, note: v.note });
    if (error) { if (error.code === '23505') throw new UserError('That’s already linked to this post.'); if (error.code === '23503') throw new UserError('That record no longer exists.'); throw error; }
    revalidatePath(`/content-intelligence/${v.contentId}`); revalidatePath('/content-intelligence');
    return { ok: true, message: 'Linked' };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function unlinkContent(id: string): Promise<ActionResult> {
  try {
    await on(); const c = await requireWritable();
    const r = ok<any>(await c.sb.from('content_links').delete().eq('id', uuid.parse(id)).eq('workspace_id', c.ws.id).select('content_id').maybeSingle());
    if (!r) throw new UserError('That link was already removed.');
    revalidatePath(`/content-intelligence/${r.content_id}`);
    return { ok: true, message: 'Link removed' };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}
