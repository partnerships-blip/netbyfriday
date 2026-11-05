import 'server-only';

export interface ChatMessage { role: 'user' | 'assistant'; content: string }
export interface Completion { text: string; stopReason: string | null }
export interface AIProvider {
  name: string;
  complete(opts: { system: string; messages: ChatMessage[]; maxTokens: number }): Promise<string>;
  /** Same call, plus why the model stopped ('max_tokens' means the answer was cut off). */
  completeWithMeta(opts: { system: string; messages: ChatMessage[]; maxTokens: number }): Promise<Completion>;
  /** One user turn that carries a document (a PDF, or plain text) plus an instruction. PDFs need a provider that reads them. */
  readDocument(opts: { system: string; instruction: string; pdfBase64?: string; text?: string; maxTokens: number }): Promise<Completion>;
}
export class AIUnavailable extends Error {}

function anthropic(): AIProvider {
  const key = process.env.ANTHROPIC_API_KEY, model = process.env.AI_MODEL;
  if (!key || !model) throw new AIUnavailable('AI is not configured.');
  return {
    name: 'anthropic',
    async complete(o) { return (await this.completeWithMeta(o)).text; },
    async completeWithMeta({ system, messages, maxTokens }) {
      // ANTHROPIC_BASE_URL is optional (defaults to the public API). The e2e suite points it at a local stub.
      const res = await fetch((process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '') + '/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
        signal: AbortSignal.timeout(45_000)
      });
      if (!res.ok) { console.error('[ai] anthropic', res.status, await res.text().catch(() => '')); throw new AIUnavailable('The AI service returned an error.'); }
      const j = await res.json();
      return { text: (j.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('').trim(), stopReason: j.stop_reason ?? null };
    },
    async readDocument({ system, instruction, pdfBase64, text, maxTokens }) {
      const doc = pdfBase64
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } }
        : { type: 'document', source: { type: 'text', media_type: 'text/plain', data: text ?? '' } };
      const res = await fetch((process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '') + '/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: [doc, { type: 'text', text: instruction }] }] }),
        signal: AbortSignal.timeout(120_000)
      });
      if (!res.ok) { console.error('[ai] anthropic document', res.status, await res.text().catch(() => '')); throw new AIUnavailable('The AI service returned an error.'); }
      const j = await res.json();
      return { text: (j.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('').trim(), stopReason: j.stop_reason ?? null };
    }
  };
}

function openaiCompatible(): AIProvider {
  const base = process.env.OPENAI_COMPATIBLE_BASE_URL, key = process.env.OPENAI_COMPATIBLE_API_KEY, model = process.env.AI_MODEL;
  if (!base || !key || !model) throw new AIUnavailable('AI is not configured.');
  return {
    name: 'openai-compatible',
    async complete(o) { return (await this.completeWithMeta(o)).text; },
    async completeWithMeta({ system, messages, maxTokens }) {
      const res = await fetch(base.replace(/\/$/, '') + '/chat/completions', {
        method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages] }),
        signal: AbortSignal.timeout(45_000)
      });
      if (!res.ok) { console.error('[ai] openai-compatible', res.status); throw new AIUnavailable('The AI service returned an error.'); }
      const j = await res.json();
      const finish = j.choices?.[0]?.finish_reason ?? null;
      return { text: String(j.choices?.[0]?.message?.content ?? '').trim(), stopReason: finish === 'length' ? 'max_tokens' : finish };
    },
    async readDocument({ system, instruction, pdfBase64, text, maxTokens }) {
      if (pdfBase64) throw new AIUnavailable('Reading PDFs needs the Anthropic provider. Paste the contract text instead.');
      return this.completeWithMeta({ system, messages: [{ role: 'user', content: `<document>\n${text ?? ''}\n</document>\n\n${instruction}` }], maxTokens });
    }
  };
}

/** Server-side only. Keys are read from the server environment and never sent to the browser. */
export function getProvider(): AIProvider {
  switch ((process.env.AI_PROVIDER || 'anthropic').toLowerCase()) {
    case 'anthropic': return anthropic();
    case 'openai-compatible': return openaiCompatible();
    default: throw new AIUnavailable('Unknown AI_PROVIDER.');
  }
}
