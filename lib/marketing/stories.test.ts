import { describe, it, expect } from 'vitest';
import { STORIES, publishedStories } from './stories';

describe('founding creator stories', () => {
  it('publishes only stories with a recorded consent date, and ships with none', () => {
    expect(publishedStories()).toEqual([]);
    STORIES.push({ name: 'A', niche: 'n', challenge: 'c', experience: 'e', consentOn: '' }, { name: 'B', niche: 'n', challenge: 'c', experience: 'e', consentOn: '2026-12-01' });
    expect(publishedStories().map(s => s.name)).toEqual(['B']);
    STORIES.length = 0;
  });
});
