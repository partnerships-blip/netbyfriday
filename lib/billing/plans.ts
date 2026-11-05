// Illustrative plans for the public site. Not final pricing: always shown with ILLUSTRATIVE_LABEL. Stripe arrives in M5.
export const ILLUSTRATIVE_LABEL = 'Illustrative plans · pricing is not final';
export type Plan = { key: 'starter' | 'pro' | 'studio'; name: string; price: string; per: string; desc: string; features: string[]; cta: string; recommended?: boolean };
export const PLANS: Plan[] = [
  { key: 'starter', name: 'Starter', price: '$0', per: 'free while in beta', desc: 'For creators getting their first brand deals organized.', cta: 'Join the waitlist',
    features: ['Partnerships, deliverables and tasks', 'Invoices with NET terms, payment tracking and shareable invoice links', 'Taxes: set-aside, quarterly dates and 1099 check', 'Dashboard calculated from your records', 'Brands & contacts'] },
  { key: 'pro', name: 'Pro', price: '$29', per: 'per month', desc: 'For full-time creators running several brand relationships at once.', cta: 'Join the waitlist', recommended: true,
    features: ['Everything in Starter', 'Contract upload: terms read for you, with reminders', 'AI Advisor that answers from your records', 'Follow-up and payment-reminder drafts you approve', 'Expected cash and payment-terms insights'] },
  { key: 'studio', name: 'Studio', price: '$59', per: 'per month', desc: 'For creators with a manager or a small team.', cta: 'Join the waitlist',
    features: ['Everything in Pro', 'Higher AI usage limits', 'Priority support during beta', 'Team seats when they launch'] }
];
