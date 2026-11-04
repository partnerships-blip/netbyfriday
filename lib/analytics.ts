import 'server-only';

type Ev = 'onboarding_step' | 'onboarding_completed' | 'deal_created' | 'deliverable_created' | 'invoice_created' | 'payment_recorded' | 'income_recorded' | 'goal_set' | 'advisor_question' | 'draft_generated' | 'opportunity_added' | 'csv_imported' | 'prototype_imported' | 'screen_view';

/**
 * Opt-in product analytics. Records only the event name, never amounts, names, or record content.
 * The RLS insert policy rejects the row unless the user has opted in, so this is safe to call unconditionally.
 */
export async function track(c: { sb: any; user: { id: string } }, event: Ev, screen?: string) {
  try { await c.sb.from('analytics_events').insert({ user_id: c.user.id, event, screen: screen ?? null }); } catch { /* never block the user on analytics */ }
}
