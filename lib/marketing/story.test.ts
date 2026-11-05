import { describe, it, expect } from 'vitest';
import { founderStory } from './story';

describe('founder story', () => {
  const s = founderStory();
  it('reads the title, byline and every paragraph from the founder’s text', () => {
    expect(s.title).toBe('The Story Behind NETBYFRIDAY');
    expect(s.byline).toBe('Founded by Poca');
    expect(s.blocks.length).toBeGreaterThan(20);
    expect(s.blocks.some(b => b.text.includes('processed by Friday'))).toBe(true);
  });
  it('turns the bold lines into pull quotes and strips formatting marks', () => {
    expect(s.blocks.filter(b => b.kind === 'quote').map(b => b.text)).toEqual(expect.arrayContaining([
      expect.stringContaining('how much money I was owed'), expect.stringContaining('better business owner'), 'Run your creator business like a business.']));
    expect(s.blocks.every(b => !b.text.includes('*'))).toBe(true);
    expect(s.blocks.some(b => b.text === 'Welcome to NETBYFRIDAY.')).toBe(true);
  });
});
