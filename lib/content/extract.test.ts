import { describe, it, expect } from 'vitest';
import { parseMetric, parsePeriod, toExtraction } from './extract';

describe('parseMetric', () => {
  it('reads counts the way apps display them', () => {
    expect(parseMetric('views', '2,599')).toBe(2599);
    expect(parseMetric('views', '1.2K')).toBe(1200);
    expect(parseMetric('views', '3.4M')).toBe(3400000);
    expect(parseMetric('likes', '211')).toBe(211);
    expect(parseMetric('views', 'about 2k?')).toBeNull();
    expect(parseMetric('views', '2,59')).toBeNull();                 // malformed thousands separator: not trusted
  });
  it('reads watch time and percentages', () => {
    expect(parseMetric('avgWatchSeconds', '4.2 sec')).toBe(4.2);
    expect(parseMetric('avgWatchSeconds', '0:42')).toBe(42);
    expect(parseMetric('avgWatchSeconds', '1m 5s')).toBe(65);
    expect(parseMetric('skipRate', '41.8%')).toBe(41.8);
    expect(parseMetric('retentionPct', '140%')).toBeNull();
  });
});

describe('parsePeriod', () => {
  it('maps common period labels, and keeps anything else as a custom period with its words', () => {
    expect(parsePeriod('Last 24 hours · Nov 6')).toEqual({ period: '24h', note: '' });
    expect(parsePeriod('Last 7 days')).toEqual({ period: '7d', note: '' });
    expect(parsePeriod('Lifetime')).toEqual({ period: 'lifetime', note: '' });
    expect(parsePeriod('Last 28 days')).toEqual({ period: 'custom', note: 'Last 28 days' });
    expect(parsePeriod('Nov 1 – Nov 3')).toEqual({ period: 'custom', note: 'Nov 1 – Nov 3' });
    expect(parsePeriod('')).toBeNull();
  });
});

describe('toExtraction', () => {
  it('flags illegible or unparseable values instead of trusting them, and ignores unknown keys and repeats', () => {
    const e = toExtraction('Here you go: {"platform":"instagram","period_text":"Last 24 hours","date_text":"Nov 6","notes":"",'
      + '"metrics":[{"key":"views","label":"Views","value_text":"2,599","legible":true},{"key":"shares","label":"Shares","value_text":"2?","legible":false},'
      + '{"key":"followers","label":"Follows","value_text":"12","legible":true},{"key":"views","label":"Plays","value_text":"9","legible":true}]}');
    expect(e.period).toEqual({ period: '24h', note: '' });
    expect(e.metrics).toEqual([{ key: 'views', label: 'Views', text: '2,599', value: 2599, clear: true }, { key: 'shares', label: 'Shares', text: '2?', value: null, clear: false }]);
    expect(e.readable).toBe(true);
  });
  it('handles a non-analytics image and broken output', () => {
    expect(toExtraction('{"platform":"unknown","period_text":"","date_text":"","metrics":[],"notes":"Not an analytics screenshot"}')).toMatchObject({ readable: false, notes: 'Not an analytics screenshot' });
    expect(toExtraction('sorry, I cannot')).toMatchObject({ readable: false });
  });
});

import { shownDate } from './extract';
describe('shownDate', () => {
  it('reads the date on the screenshot, assuming the most recent past year when none is shown', () => {
    expect(shownDate('Nov 6', '2026-11-07')).toBe('2026-11-06');
    expect(shownDate('Dec 30', '2026-01-03')).toBe('2025-12-30');
    expect(shownDate('Nov 6, 2026', '2026-11-07')).toBe('2026-11-06');
    expect(shownDate('2026-12-01', '2026-11-07')).toBeNull();          // future: not trusted
    expect(shownDate('Feb 30', '2026-11-07')).toBeNull();
    expect(shownDate('', '2026-11-07')).toBeNull();
  });
});
