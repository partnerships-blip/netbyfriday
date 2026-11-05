import 'server-only';
import story from '@/content/founder-story';
// The founder story, in Poca's own words, from content/founder-story.ts (compiled into the build, so it always deploys).
// Format: "# Title", "*Byline*", paragraphs separated by blank lines; a paragraph wrapped in **…** becomes a pull quote.
export type StoryBlock = { kind: 'p' | 'quote'; text: string };
export function founderStory() {
  const lines = story.replace(/\r\n/g, '\n').trim().split('\n');
  const titleLine = lines.find(l => l.startsWith('# ')) ?? '# The Story Behind NETBYFRIDAY';
  const bylineLine = lines.find(l => /^\*[^*].*\*$/.test(l.trim()) && /founded/i.test(l)) ?? '';
  const title = titleLine.slice(2).trim(), byline = bylineLine.trim().replace(/^\*|\*$/g, '');
  const body = lines.filter(l => l !== titleLine && l !== bylineLine).join('\n').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
  const blocks: StoryBlock[] = body.map(p => /^\*\*[\s\S]+\*\*$/.test(p) ? { kind: 'quote', text: p.replace(/^\*\*|\*\*$/g, '') }
    : { kind: 'p', text: p.replace(/^\*([^*][\s\S]*)\*$/, '$1') });
  return { title, byline, blocks };
}

// Editorial layout for /about: the same blocks, grouped into chapters. Each chapter starts at the paragraph
// beginning with `from`; the story text itself is never changed. If a marker isn't found (the story was edited),
// that chapter's paragraphs simply stay in the previous chapter.
export const CHAPTERS = [
  { n: '01', title: 'Before the business of influence', from: '' },
  { n: '02', title: 'The business behind the content', from: 'From the outside looking in' },
  { n: '03', title: 'Why “net by Friday”', from: 'That’s where the idea' },
  { n: '04', title: 'What I’m building', from: 'NETBYFRIDAY is a business workspace' },
] as const;
export type Chapter = { n: string; title: string; blocks: StoryBlock[] };
export function storyChapters() {
  const s = founderStory();
  const blocks = [...s.blocks];
  // The closing lines become the sign-off: the final pull quote and the "Welcome to NETBYFRIDAY." line.
  const finale = blocks.length && blocks[blocks.length - 1].kind === 'quote' ? blocks.pop()!.text : '';
  const welcomeAt = blocks.findIndex(b => /^welcome to netbyfriday/i.test(b.text));
  const signoff = welcomeAt >= 0 ? blocks.splice(welcomeAt, 1)[0].text : '';
  const norm = (t: string) => t.replace(/[’']/g, '’');
  const chapters: Chapter[] = [];
  for (const b of blocks) {
    const next = CHAPTERS[chapters.length];
    if (!chapters.length || (next && next.from && norm(b.text).startsWith(norm(next.from)))) {
      const c = CHAPTERS[chapters.length] ?? CHAPTERS[CHAPTERS.length - 1];
      chapters.push({ n: c.n, title: c.title, blocks: [] });
    }
    chapters[chapters.length - 1].blocks.push(b);
  }
  return { title: s.title, byline: s.byline, chapters, finale, signoff };
}
