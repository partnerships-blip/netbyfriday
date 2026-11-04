import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadApp } from '@/lib/data/load';
import { createClient } from '@/lib/supabase/server';
import { getProvider, AIUnavailable } from '@/lib/ai/provider';
import { buildAdvisorContext, advisorSystemPrompt, verifyReply } from '@/lib/ai/advisor';
import { checkAndCountAI } from '@/lib/ai/ratelimit';
import { track } from '@/lib/analytics';

const Body = z.object({ question: z.string().trim().min(1).max(1000) });

export async function POST(req: Request) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to use the Advisor.' }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Ask a question under 1,000 characters.' }, { status: 400 });

  // Records are loaded server-side through RLS for the signed-in user only. Nothing from the browser is trusted as data.
  const app = await loadApp();
  if (!(await checkAndCountAI(sb, user.id, 'advisor'))) return NextResponse.json({ error: 'You have reached the hourly Advisor limit. Try again later.' }, { status: 429 });

  const ctx = buildAdvisorContext(app.input, app.metrics, app.profile);
  const history = app.demo ? [] : app.advisorHistory.slice(-8).map((h: any) => ({ role: h.role as 'user' | 'assistant', content: h.role === 'assistant' ? JSON.stringify({ answer: h.content }) : h.content }));
  let raw: string;
  try {
    raw = await getProvider().complete({ system: advisorSystemPrompt(app.brand.name, ctx), messages: [...history, { role: 'user', content: parsed.data.question }], maxTokens: 1200 });
  } catch (e) {
    if (!(e instanceof AIUnavailable)) console.error('[advisor]', e);
    return NextResponse.json({ error: 'The Advisor is unavailable right now. Your records are unchanged.' }, { status: 503 });
  }
  const reply = verifyReply(raw, ctx);
  if (!app.demo) {
    await sb.from('advisor_messages').insert([
      { workspace_id: app.ws.id, user_id: user.id, role: 'user', content: parsed.data.question },
      { workspace_id: app.ws.id, user_id: user.id, role: 'assistant', content: reply.answer.slice(0, 20000), payload: reply }
    ]);
  }
  await track({ sb, user }, 'advisor_question');
  return NextResponse.json({ reply });
}
