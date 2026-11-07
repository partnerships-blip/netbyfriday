import { describe, it, expect } from 'vitest';
import { verifyFollowUp } from './followup';

const sources = [
  { ref: 'frame:1', label: 'Frame at 0.5s', text: 'Still frame at 0.5 seconds', numbers: [0.5] },
  { ref: 'm:skipRate', label: 'Skip rate', text: 'Skip rate: 41.8% (24 hours)', numbers: [41.8] },
  { ref: 'h:1', label: 'Gift guide (24 hours)', text: 'Gift guide: 5,650 views', numbers: [5650] }
];
const r = (o: any) => JSON.stringify({ answer: '', cites: [], points: [], ideas: [], ...o });

describe('verifyFollowUp', () => {
  it('keeps sentences whose numbers come from what the answer cites, and drops the rest', () => {
    const f = verifyFollowUp(r({ answer: 'Your skip rate was 41.8%. That is 30% worse than most creators. The opening frame is a title card.', cites: ['m:skipRate', 'frame:1'] }), sources);
    expect(f.answer).toBe('Your skip rate was 41.8%. The opening frame is a title card.');
    expect(f.removed).toBe(1);
  });
  it('keeps grounded points and statistic-free ideas', () => {
    const f = verifyFollowUp(r({ answer: 'Here are three hooks.', points: [{ lead: 'Your best comparison', point: 'Your gift guide reached 5,650 views.', cites: ['h:1'] }, { point: 'Hooks under 2s get 80% more views.', cites: ['frame:1'] }],
      ideas: [{ text: 'Open on the finished glow: “3 steps, 60 seconds, zero fuss.”' }, { text: 'Hooks with faces get 38% more reach' }] }), sources);
    expect(f.points.map(p => p.point)).toEqual(['Your gift guide reached 5,650 views.']);
    expect(f.ideas).toEqual(['Open on the finished glow: “3 steps, 60 seconds, zero fuss.”']);
    expect(f.removed).toBe(2);
  });
  it('handles unusable output', () => {
    expect(verifyFollowUp('nope', sources).answer).toMatch(/couldn’t put together/);
  });
});
