// Content Intelligence: shared vocabulary, link detection, upload limits and input schemas.
// Pure (no server or browser APIs), so the browser preview and the server actions apply the same rules.
import { z } from 'zod';

export const PLATFORMS = [['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['youtube', 'YouTube'], ['other', 'Other']] as const;
export const FORMATS = [['reel', 'Reel'], ['post', 'Feed post'], ['carousel', 'Carousel'], ['story', 'Story'], ['video', 'Video'], ['short', 'Short'], ['live', 'Live'], ['other', 'Other']] as const;
export const PERIODS = [['24h', '24 hours'], ['48h', '48 hours'], ['7d', '7 days'], ['30d', '30 days'], ['lifetime', 'Lifetime'], ['custom', 'Custom period']] as const;
export const GOALS = ['Brand awareness', 'Grow followers', 'Drive sales or clicks', 'Sponsored deliverable', 'Community engagement', 'Portfolio for pitches', 'Other'];
export type Platform = typeof PLATFORMS[number][0];
export type Format = typeof FORMATS[number][0];
export type Period = typeof PERIODS[number][0];
export const PLATFORM_LABEL = Object.fromEntries(PLATFORMS) as Record<Platform, string>;
export const FORMAT_LABEL = Object.fromEntries(FORMATS) as Record<Format, string>;
export const PERIOD_LABEL = Object.fromEntries(PERIODS) as Record<Period, string>;

/** Recognises Instagram, TikTok and YouTube links. Only identifies the platform and format: it never fetches the page. */
export function detectLink(raw: string): { ok: true; url: string; platform: Platform; format: Format; label: string } | { ok: false; error: string } {
  const t = raw.trim(); if (!t) return { ok: false, error: 'Paste a link to the post.' };
  let u: URL; try { u = new URL(/^https?:\/\//i.test(t) ? t : 'https://' + t); } catch { return { ok: false, error: 'That doesn’t look like a link.' }; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false, error: 'Use a normal web link starting with https://' };
  u.protocol = 'https:'; u.hash = '';
  const host = u.hostname.replace(/^(www\.|m\.)/, '').toLowerCase(); const p = u.pathname;
  const clean = (keep: string[] = []) => { const q = new URLSearchParams(); keep.forEach(k => { const v = u.searchParams.get(k); if (v) q.set(k, v); }); return `https://${u.hostname}${p}${q.size ? '?' + q : ''}`; };
  if (host === 'instagram.com') {
    if (/^\/(reel|reels)\/[\w-]+\/?$/.test(p)) return { ok: true, url: clean(), platform: 'instagram', format: 'reel', label: 'Instagram Reel' };
    if (/^\/p\/[\w-]+\/?$/.test(p)) return { ok: true, url: clean(), platform: 'instagram', format: 'post', label: 'Instagram post' };
    return { ok: false, error: 'Use the link to a specific Reel or post (instagram.com/reel/… or instagram.com/p/…).' };
  }
  if (host === 'tiktok.com' || host === 'vm.tiktok.com' || host === 'vt.tiktok.com') {
    if (/^\/@[\w.-]+\/(video|photo)\/\d+\/?$/.test(p)) return { ok: true, url: clean(), platform: 'tiktok', format: 'video', label: 'TikTok' };
    if (host !== 'tiktok.com' && /^\/[\w-]+\/?$/.test(p)) return { ok: true, url: clean(), platform: 'tiktok', format: 'video', label: 'TikTok (short link)' };
    return { ok: false, error: 'Use the link to a specific TikTok (tiktok.com/@you/video/…).' };
  }
  if (host === 'youtube.com' || host === 'youtu.be') {
    if (/^\/shorts\/[\w-]{6,}\/?$/.test(p)) return { ok: true, url: clean(), platform: 'youtube', format: 'short', label: 'YouTube Short' };
    if (p === '/watch' && u.searchParams.get('v')) return { ok: true, url: clean(['v']), platform: 'youtube', format: 'video', label: 'YouTube video' };
    if (host === 'youtu.be' && /^\/[\w-]{6,}\/?$/.test(p)) return { ok: true, url: clean(), platform: 'youtube', format: 'video', label: 'YouTube video' };
    if (/^\/live\/[\w-]{6,}\/?$/.test(p)) return { ok: true, url: clean(), platform: 'youtube', format: 'live', label: 'YouTube live' };
    return { ok: false, error: 'Use the link to a specific video or Short.' };
  }
  return { ok: false, error: 'Instagram, TikTok and YouTube links are supported. For anything else, choose “Other” and add the details yourself.' };
}

// Beta limits. Override with environment variables on the server (see docs/CONTENT_INTELLIGENCE.md).
export const LIMITS = {
  videoBytes: 50 * 1024 * 1024, imageBytes: 10 * 1024 * 1024, videoSeconds: 180,
  framesPerVideo: 8, frameBytes: 600 * 1024, insightsPerItem: 6, workspaceBytes: 1024 * 1024 * 1024
};
export const VIDEO_TYPES = ['video/mp4', 'video/quicktime'] as const;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AssetKind = 'media' | 'frame' | 'insight';

/** What may be uploaded for each kind. Returns an error to show, or null. */
export function checkUpload(kind: AssetKind, mime: string, bytes: number, limits = LIMITS): string | null {
  const mb = (b: number) => `${Math.round(b / 1024 / 1024)} MB`;
  if (!(bytes > 0)) return 'That file is empty.';
  if (kind === 'frame') return mime === 'image/jpeg' && bytes <= limits.frameBytes ? null : 'Frame images must be small JPEGs.';
  const video = (VIDEO_TYPES as readonly string[]).includes(mime), image = (IMAGE_TYPES as readonly string[]).includes(mime);
  if (kind === 'insight') { if (!image) return 'Upload the screenshot as a PNG, JPEG or WEBP image.'; return bytes > limits.imageBytes ? `Screenshots can be up to ${mb(limits.imageBytes)}.` : null; }
  if (!video && !image) return 'Upload an MP4 or MOV video, or a JPEG, PNG or WEBP image.';
  if (video && bytes > limits.videoBytes) return `Videos can be up to ${mb(limits.videoBytes)} during the beta. Export a shorter or lower-resolution version.`;
  if (image && bytes > limits.imageBytes) return `Images can be up to ${mb(limits.imageBytes)}.`;
  return null;
}
export const extFor = (mime: string) => ({ 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[mime] ?? 'bin';

const txt = (n: number) => z.string().trim().max(n, `Keep this under ${n} characters.`);
const count = z.union([z.literal(''), z.null(), z.coerce.number().int('Use a whole number.').min(0, 'Can’t be negative.').max(1e12)]).optional().transform(v => (v === '' || v === undefined ? null : v));
const pct = z.union([z.literal(''), z.null(), z.coerce.number().min(0, 'Use 0–100.').max(100, 'Use 0–100.')]).optional().transform(v => (v === '' || v === undefined ? null : v));
const secs = z.union([z.literal(''), z.null(), z.coerce.number().min(0).max(36000)]).optional().transform(v => (v === '' || v === undefined ? null : v));
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date.');

export const ContentSchema = z.object({
  title: z.string().trim().min(1, 'Give it a title you’ll recognise.').max(200),
  platform: z.enum(['instagram', 'tiktok', 'youtube', 'other']).default('instagram'),
  format: z.enum(['reel', 'post', 'carousel', 'story', 'video', 'short', 'live', 'other']).default('reel'),
  url: z.string().trim().max(500).default(''),
  publishedOn: z.union([z.literal(''), date]).optional().transform(v => v || null),
  category: txt(80).default(''), goal: txt(80).default(''), caption: txt(5000).default(''), description: txt(5000).default(''), transcript: txt(20000).default(''),
  durationSeconds: secs
}).superRefine((v, ctx) => {
  if (!v.url) return;
  const d = detectLink(v.url);
  if (v.platform !== 'other' && !d.ok) ctx.addIssue({ code: 'custom', path: ['url'], message: d.error });
  if (v.platform === 'other' && !/^https:\/\/[^\s]+\.[^\s]+/i.test(v.url)) ctx.addIssue({ code: 'custom', path: ['url'], message: 'Use a full link starting with https://' });
}).transform(v => { const d = v.url ? detectLink(v.url) : null; return d && d.ok ? { ...v, url: d.url } : v; });

export const SnapshotSchema = z.object({
  contentId: z.string().uuid(), measuredOn: date, period: z.enum(['24h', '48h', '7d', '30d', 'lifetime', 'custom']), periodNote: txt(80).default(''),
  views: count, reach: count, likes: count, comments: count, shares: count, saves: count, profileVisits: count, linkClicks: count, leads: count,
  avgWatchSeconds: secs, skipRate: pct, retentionPct: pct,
  source: z.enum(['creator', 'screenshot']).default('creator'), insightAssetId: z.string().uuid().nullable().optional()
}).superRefine((v, ctx) => {
  const keys = ['views', 'reach', 'likes', 'comments', 'shares', 'saves', 'profileVisits', 'linkClicks', 'leads', 'avgWatchSeconds', 'skipRate', 'retentionPct'] as const;
  if (keys.every(k => v[k] == null)) ctx.addIssue({ code: 'custom', path: ['views'], message: 'Add at least one number.' });
  if (v.period === 'custom' && !v.periodNote) ctx.addIssue({ code: 'custom', path: ['periodNote'], message: 'Say what period these numbers cover.' });
});
export const METRICS = [['views', 'Views'], ['reach', 'Accounts reached'], ['likes', 'Likes'], ['comments', 'Comments'], ['shares', 'Shares'], ['saves', 'Saves'],
  ['profileVisits', 'Profile visits'], ['linkClicks', 'Link clicks'], ['leads', 'Leads or inquiries'], ['avgWatchSeconds', 'Avg. watch time (sec)'], ['skipRate', 'Skip rate (%)'], ['retentionPct', 'Retention (%)']] as const;
export type MetricKey = typeof METRICS[number][0];

/** Checks a file's first bytes against its declared type, so a renamed file can't pass as a video or image. */
export function sniffMatches(mime: string, head: Uint8Array): boolean {
  const s = (a: number, b: number) => String.fromCharCode(...Array.from(head.slice(a, b)));
  switch (mime) {
    case 'image/jpeg': return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case 'image/png': return head[0] === 0x89 && s(1, 4) === 'PNG';
    case 'image/webp': return s(0, 4) === 'RIFF' && s(8, 12) === 'WEBP';
    case 'video/mp4': case 'video/quicktime': return ['ftyp', 'moov', 'wide', 'mdat', 'free', 'skip'].includes(s(4, 8));
    default: return false;
  }
}
