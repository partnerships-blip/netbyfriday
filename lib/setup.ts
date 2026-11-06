// Dashboard setup checklist, derived from records. Skips and hide are per-user keys in notification_reads.
export type SetupStep = { id: 'profile' | 'brand' | 'deal' | 'invoice' | 'advisor'; done: boolean; skipped: boolean };

/** Builds the checklist from records. Returns null once every step is done or skipped, or the creator hid it. */
export function setupSteps(o: { profile: { displayName?: string; niche?: string; platforms?: string[] }; brands: number; deals: number; invoices: number; askedAdvisor: boolean; keys: string[] }): SetupStep[] | null {
  if (o.keys.includes('setup:hide')) return null;
  const skip = (id: string) => o.keys.includes(`setup:skip:${id}`);
  const steps: SetupStep[] = [
    { id: 'profile', done: !!(o.profile.displayName?.trim() && o.profile.niche?.trim() && o.profile.platforms?.length), skipped: false },
    { id: 'brand', done: o.brands > 0, skipped: skip('brand') },
    { id: 'deal', done: o.deals > 0, skipped: false },
    { id: 'invoice', done: o.invoices > 0, skipped: skip('invoice') },
    { id: 'advisor', done: o.askedAdvisor, skipped: skip('advisor') }
  ];
  return steps.every(s => s.done || s.skipped) ? null : steps;
}
