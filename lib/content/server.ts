import 'server-only';
// Content Intelligence data access. Everything runs with the signed-in creator's session, so RLS limits every query
// to their workspace; media is served only through short-lived signed URLs.
import { LIMITS, type AssetKind, type Format, type Period, type Platform } from './model';

export type Limits = typeof LIMITS;
const num = (k: string, d: number) => { const v = Number(process.env[k]); return Number.isFinite(v) && v > 0 ? v : d; };
/** Beta limits, adjustable per deployment without a code change. */
export function limits(): Limits {
  return {
    ...LIMITS,
    videoBytes: num('CONTENT_MAX_VIDEO_MB', 50) * 1024 * 1024,
    imageBytes: num('CONTENT_MAX_IMAGE_MB', 10) * 1024 * 1024,
    videoSeconds: num('CONTENT_MAX_VIDEO_SECONDS', LIMITS.videoSeconds),
    workspaceBytes: num('CONTENT_STORAGE_MB', 1024) * 1024 * 1024
  };
}

export type Snapshot = { id: string; measuredOn: string; period: Period; periodNote: string; source: 'creator' | 'screenshot'; insightAssetId: string | null; createdAt: string;
  views: number | null; reach: number | null; likes: number | null; comments: number | null; shares: number | null; saves: number | null;
  profileVisits: number | null; linkClicks: number | null; leads: number | null; avgWatchSeconds: number | null; skipRate: number | null; retentionPct: number | null };
export type Asset = { id: string; kind: AssetKind; path: string; mime: string; bytes: number; frameAt: number | null; createdAt: string; url?: string };
export type ContentItem = { id: string; title: string; platform: Platform; format: Format; url: string; publishedOn: string | null; category: string; goal: string;
  caption: string; description: string; transcript: string; durationSeconds: number | null; deliverableId: string | null; createdAt: string; updatedAt: string };
export type LibraryRow = ContentItem & { thumb?: string; latest?: Snapshot; analyses: number; links: number };

const n = (v: any) => (v === null || v === undefined ? null : Number(v));
export const mapItem = (r: any): ContentItem => ({ id: r.id, title: r.title, platform: r.platform, format: r.format, url: r.url, publishedOn: r.published_on, category: r.category, goal: r.goal,
  caption: r.caption, description: r.description, transcript: r.transcript, durationSeconds: n(r.duration_seconds), deliverableId: r.deliverable_id, createdAt: r.created_at, updatedAt: r.updated_at });
export const mapSnapshot = (r: any): Snapshot => ({ id: r.id, measuredOn: r.measured_on, period: r.period, periodNote: r.period_note, source: r.source, insightAssetId: r.insight_asset_id, createdAt: r.created_at,
  views: n(r.views), reach: n(r.reach), likes: n(r.likes), comments: n(r.comments), shares: n(r.shares), saves: n(r.saves), profileVisits: n(r.profile_visits),
  linkClicks: n(r.link_clicks), leads: n(r.leads), avgWatchSeconds: n(r.avg_watch_seconds), skipRate: n(r.skip_rate), retentionPct: n(r.retention_pct) });
const mapAsset = (r: any): Asset => ({ id: r.id, kind: r.kind, path: r.path, mime: r.mime, bytes: Number(r.bytes), frameAt: n(r.frame_at_seconds), createdAt: r.created_at });

type Ctx = { sb: any; ws: { id: string } };

/** Signed URLs for display, valid for an hour. Missing files are skipped rather than failing the page. */
export async function signed(c: Ctx, paths: string[], seconds = 3600): Promise<Map<string, string>> {
  const out = new Map<string, string>(); if (!paths.length) return out;
  const { data, error } = await c.sb.storage.from('content').createSignedUrls(paths, seconds);
  if (error) { console.error('[content] sign', error.message); return out; }
  for (const d of data ?? []) if (d.signedUrl && d.path) out.set(d.path, d.signedUrl);
  return out;
}

export async function loadLibrary(c: Ctx): Promise<LibraryRow[]> {
  const [items, snaps, assets, reports, links] = await Promise.all([
    c.sb.from('content_items').select('*').eq('workspace_id', c.ws.id).order('published_on', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(500),
    c.sb.from('content_snapshots').select('*').eq('workspace_id', c.ws.id).order('measured_on', { ascending: false }).order('created_at', { ascending: false }),
    c.sb.from('content_assets').select('content_id,kind,path,mime,frame_at_seconds').eq('workspace_id', c.ws.id).in('kind', ['media', 'frame']),
    c.sb.from('content_reports').select('content_id').eq('workspace_id', c.ws.id),
    c.sb.from('content_links').select('content_id').eq('workspace_id', c.ws.id)
  ]);
  for (const r of [items, snaps, assets, reports, links]) if (r.error) throw r.error;
  // Thumbnail: an uploaded image, else the earliest frame of a video.
  const thumbPath = new Map<string, string>();
  for (const a of [...(assets.data ?? [])].sort((x: any, y: any) => (x.kind === 'media' ? 0 : 1) - (y.kind === 'media' ? 0 : 1) || Number(x.frame_at_seconds ?? 0) - Number(y.frame_at_seconds ?? 0)))
    if (!thumbPath.has(a.content_id) && a.mime.startsWith('image/')) thumbPath.set(a.content_id, a.path);
  const urls = await signed(c, Array.from(thumbPath.values()));
  const latest = new Map<string, Snapshot>(); for (const s of snaps.data ?? []) if (!latest.has(s.content_id)) latest.set(s.content_id, mapSnapshot(s));
  const tally = (rows: any[]) => rows.reduce((m, r) => m.set(r.content_id, (m.get(r.content_id) ?? 0) + 1), new Map<string, number>());
  const rc = tally(reports.data ?? []), lc = tally(links.data ?? []);
  return (items.data ?? []).map((r: any) => ({ ...mapItem(r), thumb: urls.get(thumbPath.get(r.id) ?? ''), latest: latest.get(r.id), analyses: rc.get(r.id) ?? 0, links: lc.get(r.id) ?? 0 }));
}

export async function loadItem(c: Ctx, id: string) {
  const { data: item, error } = await c.sb.from('content_items').select('*').eq('workspace_id', c.ws.id).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!item) return null;
  const [assets, snaps, ideas] = await Promise.all([
    c.sb.from('content_assets').select('*').eq('content_id', id).order('kind').order('frame_at_seconds', { ascending: true, nullsFirst: true }).order('created_at'),
    c.sb.from('content_snapshots').select('*').eq('content_id', id).order('measured_on', { ascending: false }).order('created_at', { ascending: false }),
    c.sb.from('content_ideas').select('id,text,done,created_at').eq('content_id', id).order('created_at', { ascending: false })
  ]);
  if (assets.error) throw assets.error; if (snaps.error) throw snaps.error; if (ideas.error) throw ideas.error;
  const list: Asset[] = (assets.data ?? []).map(mapAsset);
  const urls = await signed(c, list.map(a => a.path));
  return { item: mapItem(item), assets: list.map(a => ({ ...a, url: urls.get(a.path) })), snapshots: (snaps.data ?? []).map(mapSnapshot),
    ideas: (ideas.data ?? []).map((x: any) => ({ id: x.id as string, text: x.text as string, done: !!x.done })) };
}

export async function workspaceBytes(c: Ctx): Promise<number> {
  const { data, error } = await c.sb.from('content_assets').select('bytes').eq('workspace_id', c.ws.id);
  if (error) throw error;
  return (data ?? []).reduce((s: number, r: any) => s + Number(r.bytes), 0);
}

export type ReportRow = { id: string; mode: 'creative' | 'performance' | 'business'; snapshotId: string | null; savedAt: string | null; createdAt: string; report: import('./report').Report };
const mapReport = (r: any): ReportRow => ({ id: r.id, mode: r.mode, snapshotId: r.snapshot_id, savedAt: r.saved_at, createdAt: r.created_at, report: r.report });

export async function loadReports(c: Ctx, contentId: string): Promise<ReportRow[]> {
  const { data, error } = await c.sb.from('content_reports').select('*').eq('content_id', contentId).eq('workspace_id', c.ws.id).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapReport);
}

export async function loadReport(c: Ctx, contentId: string, reportId: string) {
  const { data, error } = await c.sb.from('content_reports').select('*').eq('id', reportId).eq('content_id', contentId).eq('workspace_id', c.ws.id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const item = await loadItem(c, contentId);
  if (!item) return null;
  const { data: msgs, error: me } = await c.sb.from('content_messages').select('id,role,text,created_at').eq('report_id', reportId).order('created_at');
  if (me) throw me;
  return { ...item, report: mapReport(data), messages: (msgs ?? []).map((m: any) => ({ id: m.id, role: m.role as 'user' | 'assistant', text: m.text, createdAt: m.created_at })) };
}
