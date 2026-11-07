import 'server-only';

/** Per-user hourly cap on AI requests (advisor + drafts). Counted in the database so it holds across server instances. */
export async function checkAndCountAI(sb: any, userId: string, kind: 'advisor' | 'draft' | 'contract' | 'content') {
  const limit = Number(process.env.AI_HOURLY_LIMIT || 40);
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count, error } = await sb.from('ai_usage').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', since);
  if (error) throw error;
  if ((count ?? 0) >= limit) return false;
  await sb.from('ai_usage').insert({ user_id: userId, kind });
  return true;
}

/** Content analysis: check the cap first, then record the call with its token use once it's done (for cost tracking). */
export async function underAILimit(sb: any, userId: string) {
  const limit = Number(process.env.AI_HOURLY_LIMIT || 40);
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count, error } = await sb.from('ai_usage').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', since);
  if (error) throw error;
  return (count ?? 0) < limit;
}
export async function recordAI(sb: any, userId: string, kind: 'content', usage: { inputTokens: number | null; outputTokens: number | null } | null) {
  const { error } = await sb.from('ai_usage').insert({ user_id: userId, kind, input_tokens: usage?.inputTokens ?? null, output_tokens: usage?.outputTokens ?? null });
  if (error) console.error('[ai] usage', error.message);
}
