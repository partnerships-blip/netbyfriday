import { describe, it, expect } from 'vitest';
import { setupSteps } from './setup';

const base = { profile: { displayName: 'Casey', niche: '', platforms: [] as string[] }, brands: 0, deals: 0, invoices: 0, askedAdvisor: false, keys: [] as string[] };

describe('setup checklist', () => {
  it('derives progress from records, not ticks', () => {
    const s = setupSteps({ ...base, brands: 1, deals: 2 })!;
    expect(s.map(x => [x.id, x.done])).toEqual([['profile', false], ['brand', true], ['deal', true], ['invoice', false], ['advisor', false]]);
  });
  it('needs a name, niche and at least one platform for the profile', () => {
    expect(setupSteps({ ...base, profile: { displayName: 'Casey', niche: 'Beauty', platforms: ['TikTok'] } })![0].done).toBe(true);
    expect(setupSteps({ ...base, profile: { displayName: ' ', niche: 'Beauty', platforms: ['TikTok'] } })![0].done).toBe(false);
  });
  it('lets optional steps be skipped, but not the profile or the first partnership', () => {
    const s = setupSteps({ ...base, keys: ['setup:skip:invoice', 'setup:skip:advisor', 'setup:skip:deal', 'setup:skip:profile'] })!;
    expect(s.filter(x => x.skipped).map(x => x.id)).toEqual(['invoice', 'advisor']);
  });
  it('disappears when everything is done or skipped, or when hidden', () => {
    const all = { ...base, profile: { displayName: 'C', niche: 'N', platforms: ['YouTube'] }, deals: 1, brands: 1, invoices: 0, askedAdvisor: true, keys: ['setup:skip:invoice'] };
    expect(setupSteps(all)).toBeNull();
    expect(setupSteps({ ...base, keys: ['setup:hide'] })).toBeNull();
  });
});
