import { describe, it, expect } from 'vitest';
import { verifyReport, numbersIn } from './report';

const sources = [
  { ref: 'frame:1', label: 'Frame at 0.5s', text: '', numbers: [0.5] },
  { ref: 'frame:3', label: 'Frame at 3s', text: '', numbers: [3] },
  { ref: 'caption', label: 'Caption', text: '3 steps to holiday glow', numbers: [3] },
  { ref: 'm:views', label: 'Views', text: 'Views: 2,599', numbers: [2599] },
  { ref: 'c:views', label: 'Views vs. your typical Reel', text: 'Views 2,599 is 54% below your median of 5,650 across 3 comparable Reels', numbers: [2599, 5650, 54, 3] }
];
const base = { title: 'Holiday glow', overview: null, autoLimits: [] as string[] };
const reply = (o: any) => JSON.stringify({ summary: 'A 3-step holiday makeup tutorial.', working: [], improve: [], recommendations: [], tests: [], next: [], business: null, limitations: [], ...o });

describe('numbersIn', () => {
  it('finds numbers as written, but not ref ids', () => {
    expect(numbersIn('Views 2,599 are 54% below 5,650 in frame:3 at 4.2s and $1,200')).toEqual([2599, 54, 5650, 4.2, 1200]);
  });
});

describe('verifyReport', () => {
  it('keeps grounded points and labels what they cite', () => {
    const r = verifyReport(reply({ working: [{ point: 'The finished look in the first frame is a strong visual hook.', cites: ['frame:1'] }] }), sources, { ...base, mode: 'creative', hasMetrics: false });
    expect(r.working).toEqual([{ point: 'The finished look in the first frame is a strong visual hook.', cites: ['frame:1'], citeLabels: ['Frame at 0.5s'] }]);
    expect(r.removed).toBe(0);
  });
  it('drops points with no citation, unknown citations, or invented numbers', () => {
    const r = verifyReport(reply({ improve: [
      { point: 'Hooks under 2 seconds work best.', cites: [] },
      { point: 'Your audience loves this.', cites: ['audience:all'] },
      { point: 'Views were 40% below average.', cites: ['m:views'] },
      { point: 'Views of 2,599 sit 54% below your median of 5,650.', cites: ['c:views'] }
    ] }), sources, { ...base, mode: 'performance', hasMetrics: true });
    expect(r.improve.map(p => p.point)).toEqual(['Views of 2,599 sit 54% below your median of 5,650.']);
    expect(r.removed).toBe(3);
    expect(r.limitations.at(-1)).toMatch(/3 statements were left out/);
  });
  it('never lets a creative review talk about performance it was not given', () => {
    const r = verifyReport(reply({ summary: 'This video performed well.', working: [{ point: 'This will go viral.', cites: ['frame:1'] }, { point: 'Clear 3-step structure.', cites: ['caption'] }] }), sources, { ...base, mode: 'creative', hasMetrics: false });
    expect(r.summary).toBe('');
    expect(r.working.map(p => p.point)).toEqual(['Clear 3-step structure.']);
  });
  it('fails safely on broken output', () => {
    const r = verifyReport('not json', sources, { ...base, mode: 'creative', hasMetrics: false, autoLimits: ['Only 8 still frames were reviewed.'] });
    expect(r.working).toEqual([]); expect(r.limitations).toEqual(['Only 8 still frames were reviewed.', 'The analysis couldn’t be completed. Try again in a moment.']);
  });
});

describe('quoting a calculated fact', () => {
  it('accepts every number in the fact it cites, including the period', () => {
    const facts = [{ ref: 'c:views', label: 'Views vs. typical', text: 'Views 2,599 is 54% below your median of 5,650 across 3 comparable Reels (24 hours)', numbers: [2599] }];
    const r = verifyReport(JSON.stringify({ summary: '', working: [], improve: [{ point: 'Views 2,599 is 54% below your median of 5,650 across 3 comparable Reels (24 hours).', cites: ['c:views'] }], recommendations: [], tests: [], next: [], business: null, limitations: [] }),
      facts, { mode: 'performance', title: 't', hasMetrics: true, overview: null, autoLimits: [] });
    expect(r.improve).toHaveLength(1);
  });
});

import { standOut } from './report';
import { compare } from './compare';
describe('what stands out', () => {
  it('reads like the reference, from calculated numbers only', () => {
    const others = [5650, 5000, 6300].map((views, i) => ({ snap: { contentId: 'o' + i, period: '24h' as const, measuredOn: 'x', views, shares: [84, 80, 90][i], comments: [39, 40, 38][i] } }));
    const t = { contentId: 't', period: '24h' as const, measuredOn: 'x', views: 2599, shares: 26, comments: 29, skipRate: 41.8 };
    expect(standOut(compare(t, others), t)).toEqual(['54% fewer views (2,599 views)', '69% fewer shares (26 shares)', '26% fewer comments (29 comments)', '41.8% skip rate']);
  });
  it('without history, lists the numbers plainly', () => {
    expect(standOut([], { views: 2599, shares: 1, skipRate: 41.8 })).toEqual(['2,599 views', '1 share', '41.8% skip rate']);
  });
});
