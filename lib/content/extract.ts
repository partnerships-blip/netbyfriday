// Reading metrics off an insights screenshot. The model only transcribes what it sees (label, the text of the value,
// whether it is clearly legible, and the period shown). Numbers are parsed here, deterministically; nothing is saved
// until the creator reviews every value.
import { z } from 'zod';
import type { MetricKey, Period } from './model';

export const INSIGHTS_SYSTEM = `You read screenshots of social media analytics (Instagram, TikTok, YouTube) for a creator.
Transcribe only what is visible. Never estimate, calculate, or fill in a value that is not shown.
Reply with JSON only, no prose, in exactly this shape:
{"platform": "instagram" | "tiktok" | "youtube" | "unknown",
 "period_text": the exact words describing the time period (e.g. "Last 24 hours", "Lifetime", "Nov 1 - Nov 7") or "",
 "date_text": any date shown for when this was measured or the period end, exactly as written, or "",
 "metrics": [{"key": one of "views","reach","likes","comments","shares","saves","profileVisits","linkClicks","leads","avgWatchSeconds","skipRate","retentionPct",
              "label": the label exactly as shown, "value_text": the value exactly as shown (e.g. "2,599", "1.2K", "4.2 sec", "41.8%"),
              "legible": true if you can read the value with certainty, false if it is blurry, cut off, overlapped or ambiguous}],
 "notes": short notes about anything unclear, or ""}
Mapping: "Plays"/"Views" -> views; "Accounts reached"/"Reach" -> reach; "Profile activity"/"Profile visits"/"Profile views" -> profileVisits;
"Link clicks"/"External link taps"/"Website taps" -> linkClicks; "Average watch time"/"Avg. view duration" -> avgWatchSeconds;
"Skip rate" -> skipRate; "Retention"/"Average percentage viewed" -> retentionPct; "Saves"/"Favorites" -> saves.
Leave out anything that is not one of these keys. If the image is not an analytics screen, reply {"platform":"unknown","period_text":"","date_text":"","metrics":[],"notes":"Not an analytics screenshot"}.`;

const Raw = z.object({
  platform: z.string().catch('unknown'), period_text: z.string().catch(''), date_text: z.string().catch(''), notes: z.string().catch(''),
  metrics: z.array(z.object({ key: z.string(), label: z.string().catch(''), value_text: z.string().catch(''), legible: z.boolean().catch(false) })).catch([])
});
const KEYS = ['views', 'reach', 'likes', 'comments', 'shares', 'saves', 'profileVisits', 'linkClicks', 'leads', 'avgWatchSeconds', 'skipRate', 'retentionPct'] as const;

/** "2,599" → 2599, "1.2K" → 1200, "4.2 sec" → 4.2, "0:42" → 42, "41.8%" → 41.8. Null if it isn't clearly a number. */
export function parseMetric(key: MetricKey, text: string): number | null {
  const t = text.trim().toLowerCase().replace(/ /g, ' ');
  if (!t) return null;
  if (key === 'avgWatchSeconds') {
    let m = t.match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
    if (m) return m[3] ? +m[1] * 3600 + +m[2] * 60 + +m[3] : +m[1] * 60 + +m[2];
    m = t.match(/^(?:(\d+)\s*m(?:in)?\s*)?(\d+(?:\.\d+)?)\s*(?:s|sec|secs|seconds)?$/);
    if (m) return Math.round(((m[1] ? +m[1] * 60 : 0) + +m[2]) * 100) / 100;
    return null;
  }
  if (key === 'skipRate' || key === 'retentionPct') {
    const m = t.match(/^(\d+(?:[.,]\d+)?)\s*%?$/); if (!m) return null;
    const v = +m[1].replace(',', '.'); return v >= 0 && v <= 100 ? v : null;
  }
  const m = t.match(/^(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*([km])?$/);
  if (!m) return null;
  const base = +m[1].replace(/,/g, ''), mult = m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1;
  const v = Math.round(base * mult);
  return Number.isFinite(v) ? v : null;
}

/** Maps the words shown to one of our periods. Null when it isn't clear, so the creator chooses. */
export function parsePeriod(text: string): { period: Period; note: string } | null {
  const t = text.trim().toLowerCase(); if (!t) return null;
  if (/\b(24\s*h(ours?)?|1 day|last day|past day)\b/.test(t)) return { period: '24h', note: '' };
  if (/\b(48\s*h(ours?)?|2 days)\b/.test(t)) return { period: '48h', note: '' };
  if (/\b(7 days|last week|past week|1 week)\b/.test(t)) return { period: '7d', note: '' };
  if (/\b(30 days|28 days|last month|past month)\b/.test(t)) return { period: t.includes('28') ? 'custom' : '30d', note: t.includes('28') ? 'Last 28 days' : '' };
  if (/\b(lifetime|all time|since posted|since published)\b/.test(t)) return { period: 'lifetime', note: '' };
  return { period: 'custom', note: text.trim().slice(0, 80) };
}

export type Proposed = { key: MetricKey; label: string; text: string; value: number | null; clear: boolean };
export type Extraction = { platform: string; periodText: string; dateText: string; period: { period: Period; note: string } | null; metrics: Proposed[]; notes: string; readable: boolean };

/** Turns the model's transcription into proposals. A value that's illegible or doesn't parse is flagged, never trusted. */
export function toExtraction(modelText: string): Extraction {
  const json = modelText.slice(modelText.indexOf('{'), modelText.lastIndexOf('}') + 1);
  let raw: z.infer<typeof Raw>;
  try { raw = Raw.parse(JSON.parse(json)); } catch { return { platform: 'unknown', periodText: '', dateText: '', period: null, metrics: [], notes: 'The screenshot couldn’t be read.', readable: false }; }
  const seen = new Set<string>(); const metrics: Proposed[] = [];
  for (const m of raw.metrics) {
    if (!(KEYS as readonly string[]).includes(m.key) || seen.has(m.key)) continue;
    seen.add(m.key);
    const value = parseMetric(m.key as MetricKey, m.value_text);
    metrics.push({ key: m.key as MetricKey, label: m.label.slice(0, 60), text: m.value_text.slice(0, 40), value, clear: m.legible && value !== null });
  }
  return { platform: raw.platform, periodText: raw.period_text.slice(0, 80), dateText: raw.date_text.slice(0, 40), period: parsePeriod(raw.period_text), metrics, notes: raw.notes.slice(0, 300), readable: metrics.length > 0 };
}

/** A date shown on the screenshot ("Nov 6", "Nov 6, 2026", "2026-11-06") as ISO. Without a year, the most recent past date. */
export function shownDate(text: string, today: string): string | null {
  const t = text.trim(); if (!t) return null;
  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/); if (iso) return iso[0] <= today ? iso[0] : null;
  const M = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const m = t.match(/\b([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?/); if (!m) return null;
  const mi = M.indexOf(m[1].toLowerCase()); if (mi < 0) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  let y = m[3] ? +m[3] : +today.slice(0, 4);
  let d = `${y}-${pad(mi + 1)}-${pad(+m[2])}`;
  if (!m[3] && d > today) { y -= 1; d = `${y}-${pad(mi + 1)}-${pad(+m[2])}`; }
  const dt = new Date(d + 'T00:00:00Z'); if (dt.getUTCDate() !== +m[2]) return null;
  return d <= today ? d : null;
}
