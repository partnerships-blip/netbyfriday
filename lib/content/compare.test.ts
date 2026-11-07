import { describe, it, expect } from 'vitest';
import { comparableSet, compare, rates, performanceFacts, NOT_ENOUGH } from './compare';

const item = (id: string, o: any = {}) => ({ id, platform: 'instagram', format: 'reel', title: id, ...o });
const snap = (contentId: string, o: any) => ({ contentId, period: '24h' as const, measuredOn: '2026-11-01', ...o });

describe('comparisons are like with like', () => {
  const items = [item('t'), item('a'), item('b'), item('c'), item('tt', { platform: 'tiktok' }), item('post', { format: 'post' }), item('d')];
  const snaps = [
    snap('a', { views: 5000, shares: 50 }), snap('a', { views: 4000, measuredOn: '2026-10-20' }),      // only a's latest 24h counts
    snap('b', { views: 6000, shares: 60 }), snap('c', { views: 5650, shares: 40 }),
    snap('d', { views: 90000, period: '7d' }),                                                            // different period
    snap('tt', { views: 1 }), snap('post', { views: 1 })                                                  // different platform / format
  ];
  it('picks the same platform, format and period, latest measurement each', () => {
    const set = comparableSet(items[0], '24h', items, snaps);
    expect(set.map(x => [x.item.id, x.snap.views])).toEqual([['a', 5000], ['b', 6000], ['c', 5650]]);
  });
  it('compares with the median and states the difference, calculated here', () => {
    const c = compare({ contentId: 't', period: '24h', measuredOn: '2026-11-06', views: 2599, shares: 26, skipRate: 41.8 }, comparableSet(items[0], '24h', items, snaps));
    const v = c.find(x => x.metric === 'views')!;
    expect(v).toMatchObject({ value: 2599, median: 5650, n: 3, diffPct: -54, direction: 'below' });
    expect(c.find(x => x.metric === 'skipRate')).toBeUndefined();                // no history for skip rate: no comparison
    expect(c.find(x => x.metric === 'shareRate')).toMatchObject({ value: 1, median: 1, direction: 'in line' });
  });
  it('says so plainly when there isn’t enough history', () => {
    const c = compare({ contentId: 't', period: '24h', measuredOn: '2026-11-06', views: 2599 }, comparableSet(items[0], '24h', items, snaps.slice(0, 3)));
    expect(c).toEqual([]);
    const f = performanceFacts({ contentId: 't', period: '24h', measuredOn: '2026-11-06', views: 2599 }, '24 hours', c, 2, 'Reel');
    expect(f.find(x => x.ref === 'c:history')!.text).toBe(NOT_ENOUGH);
    expect(f.find(x => x.ref === 'm:views')!.text).toBe('Views: 2,599 (24 hours)');
  });
  it('derives rates only from numbers that exist', () => {
    expect(rates({ contentId: 't', period: '24h', measuredOn: 'x', views: 2599, likes: 211, comments: 29, shares: 26, saves: 48 })).toEqual({ engagementRate: 12.08, shareRate: 1, saveRate: 1.85, commentRate: 1.12 });
    expect(rates({ contentId: 't', period: '24h', measuredOn: 'x', shares: 26 })).toEqual({});
  });
});
