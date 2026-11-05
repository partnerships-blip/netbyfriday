import { describe, it, expect } from 'vitest';
import { founderStory, storyChapters } from './story';

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

describe('editorial chapters for /about', () => {
  const s = founderStory(), e = storyChapters();
  it('splits the story into four chapters at the right paragraphs', () => {
    expect(e.chapters.map(c => c.n)).toEqual(['01', '02', '03', '04']);
    expect(e.chapters[1].blocks[0].text.startsWith('From the outside looking in')).toBe(true);
    expect(e.chapters[2].blocks[0].text.startsWith('That')).toBe(true);
    expect(e.chapters[3].blocks[0].text.startsWith('NETBYFRIDAY is a business workspace')).toBe(true);
  });
  it('keeps every word: chapters + sign-off + finale are exactly the original blocks, in order', () => {
    const rebuilt = e.chapters.flatMap(c => c.blocks.map(b => b.text));
    expect(e.finale).toBe('Run your creator business like a business.');
    expect(e.signoff).toBe('Welcome to NETBYFRIDAY.');
    const original = s.blocks.map(b => b.text).filter(t => t !== e.finale && t !== e.signoff);
    expect(rebuilt).toEqual(original);
  });
});
