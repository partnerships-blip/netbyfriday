// V1 feature flags. Off-by-default features keep their code but are removed from navigation and their routes 404.
// Turn one on for a deployment with NEXT_PUBLIC_NBF_FLAGS=insights,opportunities (comma separated). Not secret.
// Launched features are on by default; switch one off for a deployment with a leading minus, e.g. NEXT_PUBLIC_NBF_FLAGS=-taxes.
export type Flag = 'insights' | 'opportunities' | 'audience' | 'attachments' | 'prototypeImport' | 'whiteLabel' | 'contracts' | 'taxes' | 'invoiceLinks';
const DEFAULT_ON: Flag[] = ['contracts', 'taxes', 'invoiceLinks'];   // launched 2026-11-05
const list = (process.env.NEXT_PUBLIC_NBF_FLAGS ?? '').split(',').map(s => s.trim()).filter(Boolean);
const on = new Set<string>([...DEFAULT_ON.filter(f => !list.includes('-' + f)), ...list.filter(s => !s.startsWith('-'))]);
export const flag = (f: Flag) => on.has(f);
