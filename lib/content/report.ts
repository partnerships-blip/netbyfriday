// Content reports: what the model is given, what it must return, and the check every statement passes before it is shown.
// Rule (same as the Advisor): each point cites what it is based on, and any number in it must come from what it cites.
// The performance overview and the data limitations are written here, not by the model.
import { z } from 'zod';
import type { Fact, Comparison } from './compare';
import { NOT_ENOUGH, fmtNum } from './compare';

export const PROMPT_VERSION = 'content-report-v2';
export type Mode = 'creative' | 'performance' | 'business';
export type Source = { ref: string; label: string; text: string; numbers: number[] };
export type Point = { lead?: string; point: string; cites: string[]; citeLabels: string[] };
export type Report = {
  mode: Mode; title: string; summary: string;
  overview: { lines: string[]; comparisons: Comparison[]; periodLabel: string } | null;
  working: Point[]; improve: Point[]; recommendations: Point[]; tests: Point[];
  next: (Point & { title: string })[]; business: Point | null; limitations: string[]; removed: number;
  /** What the report was allowed to use; follow-up answers are checked against these too. */
  sources?: Source[];
};

export const REPORT_SYSTEM = `You are a sharp, kind content strategist working inside NETBYFRIDAY, a business workspace for creators.
You review one piece of the creator's content using ONLY the material provided: still frames from the video (labelled frame:N with their time),
an image, the caption, the creator's description, the voiceover or on-screen text they pasted, their goal, and (for performance check-ins) facts
with numbers that were calculated for you.

Rules:
- Every point must cite the refs it is based on, e.g. ["frame:1","frame:2"] or ["m:skipRate","c:skipRate"]. Never cite a ref you weren't given.
- Use numbers only if they appear in what you cite (or simple counts like "the first 3 seconds" when frame times support it). Never calculate new numbers.
- Frames are stills: you cannot see motion, hear audio, or know what happens between frames. Say "in the frames provided" when it matters.
- Without performance facts, never say how the content performed or will perform.
- With performance facts, describe what the numbers show; don't claim a cause. Prefer "may", "one possibility", "worth testing".
- Be specific and practical. Talk to the creator as "you". No generic advice that would fit any post.
- Linked partnerships or income are records the creator made; never say the content caused them.

Reply with JSON only:
{"summary": creative review: one or two sentences on what the content is and its aim. Check-in: a plain-English verdict in one or two
            sentences, like a strategist talking to the creator ("Your X reel is trailing your usual Reels at the 24-hour mark, mostly on
            distribution, while comments are holding up"), using only the calculated facts,
 "working": [{"lead": a short bold lead-in of 3-8 words, e.g. "Your offer is clear and comment-driven", "point": "...", "cites": [...]}],  // 2-4 strengths
 // every item in working, improve and recommendations has a "lead" like that
 "improve": [{"point": "...", "cites": [...]}],          // 2-4 weaknesses or opportunities
 "recommendations": [{"point": "...", "cites": [...]}],  // 2-4 specific revisions
 "tests": [{"point": "...", "cites": [...]}],            // exactly 3 variations to test next
 "next": [{"title": short name, "point": why it fits, "cites": [...]}],  // 3-5 follow-up content concepts
 "business": {"point": how this could support a brand pitch or positioning, "cites": [...]} or null if nothing supports it,
 "limitations": [anything you could not assess]}`;

const PointRaw = z.object({ lead: z.string().catch('').optional(), point: z.string(), cites: z.array(z.string()).catch([]) });
const Raw = z.object({
  summary: z.string().catch(''),
  working: z.array(PointRaw).catch([]), improve: z.array(PointRaw).catch([]), recommendations: z.array(PointRaw).catch([]), tests: z.array(PointRaw).catch([]),
  next: z.array(PointRaw.extend({ title: z.string().catch('') })).catch([]),
  business: PointRaw.nullable().catch(null), limitations: z.array(z.string()).catch([])
});

/** Numbers as written: 2,599 · 41.8% · 4.2s · $1,200 · 54%. Ignores digits inside refs like frame:3. */
export function numbersIn(text: string): number[] {
  return Array.from(text.replace(/\b(frame|m|r|c):[a-z0-9]+/gi, ' ').matchAll(/(?<![\w.])\$?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(?![\d]|[.,]\d)/g)).map(m => Number(m[1].replace(/,/g, '')));
}
const close = (a: number, b: number) => a === b || Math.abs(a - b) <= Math.max(0.051, Math.abs(b) * 0.005);
const PERF_WORDS = /\b(views?|reach(ed)?|performed|performing|performance|engagement rate|went viral|viral|algorithm|watch time|skip rate|retention)\b/i;

/** Keeps only points that cite known sources and whose numbers come from those sources. Counts what was removed. */
export function verifyReport(raw: string, sources: Source[], o: { mode: Mode; title: string; hasMetrics: boolean; overview: Report['overview']; autoLimits: string[] }): Report {
  const by = new Map(sources.map(s => [s.ref, { ...s, numbers: [...s.numbers, ...numbersIn(s.text)] }]));
  let j: z.infer<typeof Raw> | null = null;
  try { j = Raw.parse(JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))); } catch { j = null; }
  let removed = 0;
  const check = (p: { lead?: string; point: string; cites: string[] } | null | undefined): Point | null => {
    if (!p) return null;
    const lead = String(p.lead ?? '').trim().replace(/[:.]+$/, '').slice(0, 80);
    const text = String(p.point ?? '').trim().slice(0, 700); const cites = Array.from(new Set(p.cites.map(String))).slice(0, 8);
    const known = cites.filter(c => by.has(c));
    if (!text || !known.length || known.length !== cites.length) { removed++; return null; }
    if (!o.hasMetrics && PERF_WORDS.test(lead + ' ' + text)) { removed++; return null; }       // no numbers given: no performance claims
    const allowed = known.flatMap(c => by.get(c)!.numbers);
    const bad = numbersIn(lead + ' ' + text).filter(n => !(Number.isInteger(n) && n >= 1 && n <= 10) && !allowed.some(a => close(n, a)));
    if (bad.length) { removed++; return null; }
    return { ...(lead ? { lead } : {}), point: text, cites: known, citeLabels: known.map(c => by.get(c)!.label) };
  };
  const list = (xs: { lead?: string; point: string; cites: string[] }[], max: number) => xs.slice(0, max).map(check).filter((x): x is Point => !!x);
  if (!j) return { mode: o.mode, title: o.title, summary: '', overview: o.overview, working: [], improve: [], recommendations: [], tests: [], next: [], business: null,
    limitations: [...o.autoLimits, 'The analysis couldn’t be completed. Try again in a moment.'], removed: 0 };
  // The summary may not carry numbers the sources don't support either.
  const allNums = Array.from(by.values()).flatMap(s => s.numbers);
  const summaryOk = numbersIn(j.summary).every(n => (Number.isInteger(n) && n <= 10) || allNums.some(a => close(n, a))) && (o.hasMetrics || !PERF_WORDS.test(j.summary));
  const next = j.next.slice(0, 5).map(n => { const p = check(n); return p ? { ...p, title: String(n.title ?? '').slice(0, 80) || 'Idea' } : null; }).filter((x): x is Point & { title: string } => !!x);
  const report: Report = {
    mode: o.mode, title: o.title, summary: summaryOk ? j.summary.slice(0, 500) : '', overview: o.overview,
    working: list(j.working, 4), improve: list(j.improve, 4), recommendations: list(j.recommendations, 4), tests: list(j.tests, 3), next,
    business: check(j.business), removed: 0,
    limitations: [...o.autoLimits, ...j.limitations.map(s => String(s).slice(0, 240)).filter(s => !numbersIn(s).some(n => !(n <= 10) && !allNums.some(a => close(n, a)))).slice(0, 4)]
  };
  if (!summaryOk) removed++;
  report.removed = removed;
  if (removed) report.limitations.push(`${removed} ${removed === 1 ? 'statement was' : 'statements were'} left out because ${removed === 1 ? 'it' : 'they'} couldn’t be checked against what you provided.`);
  return report;
}

/** "What stands out": compact lines written from calculated comparisons only (e.g. "54% fewer views (2,599 views)"). */
const NOUN: Record<string, [string, string]> = { views: ['views', 'view'], reach: ['accounts reached', 'account reached'], likes: ['likes', 'like'], comments: ['comments', 'comment'],
  shares: ['shares', 'share'], saves: ['saves', 'save'], profileVisits: ['profile visits', 'profile visit'], linkClicks: ['link clicks', 'link click'], leads: ['leads', 'lead'] };
const ORDER = ['views', 'reach', 'shares', 'comments', 'saves', 'likes', 'skipRate', 'avgWatchSeconds', 'retentionPct', 'profileVisits', 'linkClicks', 'leads'];  // derived rates stay in the facts the AI can cite, not in this list
export function standOut(comps: Comparison[], values: Record<string, any>): string[] {
  const by = new Map(comps.map(c => [c.metric as string, c]));
  const out: string[] = [];
  for (const k of ORDER) {
    const c = by.get(k), v = c?.value ?? values[k];
    if (v == null || out.length >= 5) continue;
    const n = NOUN[k];
    if (n) {
      const what = `${fmtNum(k, v)} ${v === 1 ? n[1] : n[0]}`;
      out.push(!c ? what : c.direction === 'in line' ? `${what}, in line with your usual` : `${Math.abs(c.diffPct)}% ${c.diffPct < 0 ? 'fewer' : 'more'} ${n[0]} (${what})`);
    } else {
      const label = k === 'skipRate' ? 'skip rate' : k === 'avgWatchSeconds' ? 'average watch time' : k === 'retentionPct' ? 'retention' : c?.label.toLowerCase() ?? k;
      out.push(`${fmtNum(k, v)} ${label}${!c ? '' : c.direction === 'in line' ? ', in line with your usual' : ` (${Math.abs(c.diffPct)}% ${c.diffPct > 0 ? 'higher' : 'lower'} than your usual ${fmtNum(k, c.median)})`}`);
    }
  }
  return out;
}

export const metricCards = (facts: Fact[]) => facts.filter(f => f.ref.startsWith('m:')).map(f => ({ ref: f.ref, label: f.label, value: f.text.split(': ')[1]?.replace(/ \(.*\)$/, '') ?? '' }));
export { fmtNum };
