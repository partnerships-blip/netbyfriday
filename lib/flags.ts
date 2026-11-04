// V1 feature flags. Off-by-default features keep their code but are removed from navigation and their routes 404.
// Turn one on for a deployment with NEXT_PUBLIC_NBF_FLAGS=insights,opportunities (comma separated). Not secret.
export type Flag = 'insights' | 'opportunities' | 'audience' | 'attachments' | 'prototypeImport' | 'whiteLabel';
const on = new Set((process.env.NEXT_PUBLIC_NBF_FLAGS ?? '').split(',').map(s => s.trim()).filter(Boolean));
export const flag = (f: Flag) => on.has(f);
