// Performance comparisons, calculated here (never by the model). Like with like: same platform, same format,
// same reporting period. Below MIN_COMPARABLE items there is no comparison, only the creator's own numbers.
import { METRICS, type MetricKey, type Period } from './model';

export const MIN_COMPARABLE = 3;
export const NOT_ENOUGH = 'Not enough historical content has been added to calculate a reliable comparison yet.';

export type SnapLite = { contentId: string; period: Period; measuredOn: string; createdAt?: string } & Partial<Record<MetricKey, number | null>>;
export type ItemLite = { id: string; platform: string; format: string; title: string };
export type Fact = { ref: string; label: string; text: string; numbers: number[] };
export type Comparison = { metric: MetricKey | RateKey; label: string; value: number; median: number; mean: number; n: number; diffPct: number; direction: 'above' | 'below' | 'in line' };
export type RateKey = 'engagementRate' | 'shareRate' | 'saveRate' | 'commentRate';

const RATES: [RateKey, string, (s: SnapLite) => number | null][] = [
  ['engagementRate', 'Engagement rate', s => s.views ? sum([s.likes, s.comments, s.shares, s.saves]) / s.views * 100 : null],
  ['shareRate', 'Share rate', s => s.views && s.shares != null ? s.shares / s.views * 100 : null],
  ['saveRate', 'Save rate', s => s.views && s.saves != null ? s.saves / s.views * 100 : null],
  ['commentRate', 'Comment rate', s => s.views && s.comments != null ? s.comments / s.views * 100 : null]
];
function sum(xs: (number | null | undefined)[]) { const v = xs.filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) : NaN; }
export const round = (v: number, dp = 1) => Math.round(v * 10 ** dp) / 10 ** dp;
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const fmtNum = (k: string, v: number) => k === 'skipRate' || k === 'retentionPct' || k.endsWith('Rate') ? `${round(v)}%` : k === 'avgWatchSeconds' ? `${round(v)}s` : Math.round(v).toLocaleString('en-US');
const LABEL = Object.fromEntries(METRICS) as Record<MetricKey, string>;
const lower = new Set<string>(['skipRate']);   // for these, lower is better

/** Rates derived from a snapshot (only when the inputs exist). */
export function rates(s: SnapLite): Partial<Record<RateKey, number>> {
  const out: Partial<Record<RateKey, number>> = {};
  for (const [k, , f] of RATES) { const v = f(s); if (v != null && Number.isFinite(v)) out[k] = round(v, 2); }
  return out;
}

/** The latest snapshot for each other item with the same platform, format and period. */
export function comparableSet(item: ItemLite, period: Period, items: ItemLite[], snaps: SnapLite[]): { item: ItemLite; snap: SnapLite }[] {
  const latest = new Map<string, SnapLite>();
  for (const s of [...snaps].sort((a, b) => (b.measuredOn + (b.createdAt ?? '')).localeCompare(a.measuredOn + (a.createdAt ?? ''))))
    if (s.period === period && s.contentId !== item.id && !latest.has(s.contentId)) latest.set(s.contentId, s);
  return items.filter(i => i.id !== item.id && i.platform === item.platform && i.format === item.format && latest.has(i.id)).map(i => ({ item: i, snap: latest.get(i.id)! }));
}

/** Compares a snapshot with comparable content. Each metric needs its own MIN_COMPARABLE data points. */
export function compare(target: SnapLite, set: { snap: SnapLite }[]): Comparison[] {
  const out: Comparison[] = [];
  const add = (metric: MetricKey | RateKey, label: string, value: number | null | undefined, others: (number | null | undefined)[]) => {
    const xs = others.filter((x): x is number => x != null && Number.isFinite(x));
    if (value == null || xs.length < MIN_COMPARABLE) return;
    const med = median(xs), mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const diffPct = med === 0 ? 0 : Math.round((value - med) / med * 100);
    const band = Math.abs(diffPct) < 10 ? 'in line' : diffPct > 0 ? 'above' : 'below';
    out.push({ metric, label, value, median: round(med, 2), mean: round(mean, 2), n: xs.length, diffPct, direction: band });
  };
  for (const [k] of METRICS) add(k, LABEL[k], target[k], set.map(x => x.snap[k]));
  const tr = rates(target);
  for (const [k, l, f] of RATES) add(k, l, tr[k], set.map(x => f(x.snap)));
  return out;
}

/** What the model may cite: every number it can use, labelled, with a reference id. */
export function performanceFacts(target: SnapLite, periodLabel: string, comps: Comparison[], nComparable: number, formatLabel: string): Fact[] {
  const facts: Fact[] = [];
  for (const [k, l] of METRICS) { const v = target[k]; if (v != null) facts.push({ ref: `m:${k}`, label: l, text: `${l}: ${fmtNum(k, v)} (${periodLabel})`, numbers: [v] }); }
  for (const [k, v] of Object.entries(rates(target))) { const l = RATES.find(r => r[0] === k)![1]; facts.push({ ref: `r:${k}`, label: l, text: `${l}: ${fmtNum(k, v!)} (calculated)`, numbers: [v!, round(v!, 1)] }); }
  for (const c of comps) {
    const good = lower.has(c.metric) ? c.diffPct < 0 : c.diffPct > 0;
    facts.push({ ref: `c:${c.metric}`, label: `${c.label} vs. your typical ${formatLabel}`,
      text: `${c.label} ${fmtNum(c.metric, c.value)} is ${c.direction === 'in line' ? 'in line with' : `${Math.abs(c.diffPct)}% ${c.direction}`} your median of ${fmtNum(c.metric, c.median)} across ${c.n} comparable ${formatLabel}s (${periodLabel})${c.direction === 'in line' ? '' : good ? ', a stronger result' : ', a weaker result'}`,
      numbers: [c.value, c.median, Math.abs(c.diffPct), c.n, round(c.value, 1), round(c.median, 1), round(c.mean, 1)] });
  }
  facts.push({ ref: 'c:history', label: 'Comparison basis', text: comps.length ? `${nComparable} comparable ${formatLabel}s with ${periodLabel} numbers were found.` : NOT_ENOUGH, numbers: [nComparable] });
  return facts;
}
