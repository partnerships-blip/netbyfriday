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
