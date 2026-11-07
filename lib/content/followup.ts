// Follow-up questions about a content analysis. Same grounding rule as the report: every point cites a source, and any
// number must come from what it cites. Rewrites and hooks are creative text, so they carry no numbers of their own.
import { z } from 'zod';
import { numbersIn, type Source, type Point } from './report';

export const FOLLOWUP_SYSTEM = `You are the creator's content strategist inside NETBYFRIDAY, continuing a conversation about one analysis.
You have: the analysis, the sources it was built from (frames, caption, description, voiceover text, calculated facts), and the creator's
other recent content of the same kind (refs h:N) with the numbers they recorded.
Rules:
- Answer the question directly and specifically. Talk to the creator as "you". Short paragraphs; no headings.
- Use numbers only if they appear in the sources you cite. Never calculate new numbers; if a comparison isn't in the sources, say it isn't available.
- When numbers can't explain *why* (e.g. why people skipped), give possibilities to test, tied to what's visible in the frames or text.
- You can't see motion or hear audio; frames are stills.
- For rewrites, hooks, scripts or plans, put each one in "ideas" so the creator can save it. Ideas contain no statistics.
- You never send messages, publish, or change records. Linked deals are records, not proof the post caused them.
Reply with JSON only:
{"answer": "your reply (plain text, may be a few short paragraphs)",
 "points": [{"lead": optional 3-8 word lead-in, "point": "...", "cites": [refs]}],   // 0-4 supporting points
 "ideas": [{"text": a hook, rewrite, concept or plan step the creator could save}],   // 0-6
 "cites": [refs the answer relies on]}`;

const Raw = z.object({
  answer: z.string().catch(''), cites: z.array(z.string()).catch([]),
  points: z.array(z.object({ lead: z.string().catch('').optional(), point: z.string(), cites: z.array(z.string()).catch([]) })).catch([]),
  ideas: z.array(z.object({ text: z.string() })).catch([])
});
export type FollowUp = { answer: string; points: Point[]; ideas: string[]; removed: number };

const close = (a: number, b: number) => a === b || Math.abs(a - b) <= Math.max(0.051, Math.abs(b) * 0.005);
const small = (n: number) => Number.isInteger(n) && n >= 1 && n <= 10;

/** Removes any sentence, point or idea that carries a number the cited sources don't contain. */
export function verifyFollowUp(raw: string, sources: Source[]): FollowUp {
  const by = new Map(sources.map(s => [s.ref, [...s.numbers, ...numbersIn(s.text)]]));
  let j: z.infer<typeof Raw>;
  try { j = Raw.parse(JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))); }
  catch { return { answer: 'I couldn’t put together a checked answer to that. Try asking it a different way.', points: [], ideas: [], removed: 0 }; }
  let removed = 0;
  const allowedFor = (cites: string[]) => cites.filter(c => by.has(c)).flatMap(c => by.get(c)!);
  const okNums = (text: string, allowed: number[]) => numbersIn(text).every(n => small(n) || allowed.some(a => close(n, a)));
  // The answer: keep sentences whose numbers come from the sources it says it relies on.
  const answerAllowed = allowedFor(j.cites);
  const sentences = j.answer.slice(0, 3000).split(/(?<=[.!?])\s+(?=[A-Z“"(])/);
  const kept = sentences.filter(s => { const ok = okNums(s, answerAllowed); if (!ok) removed++; return ok; });
  const points: Point[] = [];
  for (const p of j.points.slice(0, 4)) {
    const cites = Array.from(new Set(p.cites)); const known = cites.filter(c => by.has(c));
    const lead = String(p.lead ?? '').trim().replace(/[:.]+$/, '').slice(0, 80); const text = p.point.trim().slice(0, 600);
    if (!text || !known.length || known.length !== cites.length || !okNums(lead + ' ' + text, allowedFor(known))) { removed++; continue; }
    points.push({ ...(lead ? { lead } : {}), point: text, cites: known, citeLabels: known.map(c => sources.find(s => s.ref === c)!.label) });
  }
  // Ideas are creative text ("3 steps, 60 seconds"); only statistic-style claims are refused.
  const STAT = /\d[\d,.]*\s*%|\b\d[\d,.]*\s*(x|times)\b|\b\d[\d,.]*\s*(more|fewer|less|higher|lower)\b|\b\d[\d,.]*\s*(views|likes|shares|followers|reach|comments|saves|impressions)\b/i;
  const ideas = j.ideas.slice(0, 6).map(i => i.text.trim().slice(0, 400)).filter(t => { const ok = !!t && !STAT.test(t); if (!ok && t) removed++; return ok; });
  const answer = kept.join(' ').trim() || (points.length || ideas.length ? '' : 'I couldn’t answer that from what’s been added so far.');
  return { answer, points, ideas, removed };
}
