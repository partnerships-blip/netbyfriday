import { z } from 'zod';
import { parseMoneyToCents, STAGES } from './finance/core.js';
import { DEAL_TYPES, SCHEDULES, TRIGGERS } from './deals';

const STAGE_KEYS = STAGES.map(s => s[0]) as [string, ...string[]];
const DEAL_TYPE_KEYS = DEAL_TYPES.map(t => t[0]) as unknown as [typeof DEAL_TYPES[number][0], ...typeof DEAL_TYPES[number][0][]];
const SCHEDULE_KEYS = SCHEDULES.map(t => t[0]) as unknown as [typeof SCHEDULES[number][0], ...typeof SCHEDULES[number][0][]];
const TRIGGER_KEYS = TRIGGERS.map(t => t[0]) as unknown as [typeof TRIGGERS[number][0], ...typeof TRIGGERS[number][0][]];
export const STREAM_KEYS = ['brand', 'affiliate', 'events', 'digital', 'appearances', 'other'] as const;
export const DELIVERABLE_KEYS = ['not_started', 'in_progress', 'in_review', 'approved', 'posted', 'scheduled'] as const;
export const OPP_STATUS = ['new', 'saved', 'pitched', 'dismissed'] as const;

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`);
const req = (label: string, max = 160) => z.string().trim().min(1, `${label} is required.`).max(max);
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date.').refine(s => !Number.isNaN(Date.parse(s + 'T00:00:00Z')), 'Use a valid date.');
export const uuid = z.string().uuid();
/** Money from a text field → integer cents. Rejects negatives and malformed input. */
export const money = (label: string, { positive = false } = {}) =>
  z.union([z.string(), z.number()]).transform((v, ctx) => {
    const c = parseMoneyToCents(v);
    if (c === null) { ctx.addIssue({ code: 'custom', message: `${label} must be an amount like 1250 or 1,250.00.` }); return z.NEVER; }
    if (positive && c <= 0) { ctx.addIssue({ code: 'custom', message: `${label} must be more than $0.` }); return z.NEVER; }
    return c;
  });
const optionalMoney = (label: string) => z.union([z.literal(''), z.undefined(), z.string(), z.number()]).transform((v, ctx) => {
  if (v === '' || v === undefined) return 0;
  const c = parseMoneyToCents(v);
  if (c === null) { ctx.addIssue({ code: 'custom', message: `${label} must be an amount like 1250.` }); return z.NEVER; }
  return c;
});
const email = z.union([z.literal(''), z.string().trim().email('Use a valid email address.').max(254)]);

export const DealSchema = z.object({
  brand: req('Brand', 120), campaign: text(200).default(''), agency: text(120).default(''), contactName: text(120).default(''), contactEmail: email.default(''),
  description: text(5000).default(''), fee: optionalMoney('Fee'), feeIsEstimate: z.coerce.boolean().default(false), stage: z.enum(STAGE_KEYS).default('lead'),
  platforms: z.array(text(40)).max(10).default([]), contentCategory: text(80).default(''), contractStatus: text(200).default(''), usageRights: text(500).default(''),
  exclusivity: text(500).default(''), paymentTerms: text(200).default(''), notes: text(10000).default(''),
  startedOn: isoDate.optional(), lastContactOn: isoDate.optional(), contactId: z.union([uuid, z.literal('')]).optional(),
  dealType: z.enum(DEAL_TYPE_KEYS).default('sponsored'), giftedValue: optionalMoney('Gifted value'), commissionTerms: text(200).default(''),
  paymentSchedule: z.enum(SCHEDULE_KEYS).default('single'), paymentTrigger: z.enum(TRIGGER_KEYS).default(''), scheduleNote: text(500).default('')
});
export const DealPatchSchema = DealSchema.partial().extend({ id: uuid, contactId: z.union([uuid, z.literal('')]).optional() });
// Moving to Paid records the money. `amount` is only needed when the records can't tell (estimated or $0 fee).
export const MoveDealSchema = z.object({ id: uuid, stage: z.enum(STAGE_KEYS), receivedOn: isoDate.optional(),
  amount: z.union([z.literal(''), z.undefined(), z.string(), z.number()]).transform((v, ctx) => {
    if (v === '' || v === undefined) return undefined;
    const c = parseMoneyToCents(v);
    if (c === null || c <= 0) { ctx.addIssue({ code: 'custom', message: 'Enter the amount you received, like 3800 or 3,800.00.' }); return z.NEVER; }
    return c;
  }) });
export const SettleDealSchema = MoveDealSchema.omit({ stage: true });

// Absent stays absent (a patch leaves it alone); '' clears it; a date sets it.
const patchDate = z.union([z.literal(''), z.null(), isoDate]).optional().transform(v => v === undefined ? undefined : v || null);
const delDetails = { platform: text(40).optional(), submitBy: patchDate, submittedOn: patchDate, publishedOn: patchDate,
  revisions: z.coerce.number().int().min(0, 'Revisions can’t be negative.').max(50).optional(),
  contentUrl: z.union([z.literal(''), z.string().trim().max(500).url('Use a full link starting with https://').refine(u => /^https?:\/\//i.test(u), 'Use a full link starting with https://')]).optional() };
export const DeliverableSchema = z.object({ dealId: uuid, name: req('Deliverable', 200), dueOn: isoDate, status: z.enum(DELIVERABLE_KEYS).default('not_started'), notes: text(2000).default(''), ...delDetails });
export const DeliverablePatchSchema = z.object({ id: uuid, name: req('Deliverable', 200).optional(), dueOn: isoDate.optional(), status: z.enum(DELIVERABLE_KEYS).optional(), notes: text(2000).optional(), ...delDetails });

export const InvoiceSchema = z.object({
  clientName: req('Client'), description: text(2000).default(''), amount: money('Amount', { positive: true }), stream: z.enum(STREAM_KEYS).default('brand'),
  issuedOn: isoDate, dueOn: isoDate, terms: text(60).default('Net 30'), dealId: z.union([uuid, z.literal('')]).default('')
}).refine(v => v.dueOn >= v.issuedOn, { message: 'Due date must be on or after the issue date.', path: ['dueOn'] });
export const PaymentSchema = z.object({ invoiceId: uuid, amount: money('Amount', { positive: true }), receivedOn: isoDate, note: text(500).default('') });
export const IncomeSchema = z.object({ stream: z.enum(STREAM_KEYS), amount: money('Amount', { positive: true }), receivedOn: isoDate, counterparty: text(160).default(''), description: text(500).default('') });
export const ExpenseSchema = z.object({ category: req('Category', 120), amount: money('Amount', { positive: true }), spentOn: isoDate, note: text(500).default('') });
export const GoalsSchema = z.object({ monthly: optionalMoney('Monthly goal'), annual: optionalMoney('Annual goal') });
export const OpportunitySchema = z.object({ name: req('Name'), category: req('Category', 80), location: text(120).default(''), fit: text(2000).default(''), source: text(300).default('Added by you'), angle: text(2000).default('') });
export const OppStatusSchema = z.object({ id: uuid, status: z.enum(OPP_STATUS) });
export const SnapshotSchema = z.object({ platform: req('Platform', 40), followers: z.coerce.number().int().min(0).max(1e9), engagementRate: z.union([z.literal(''), z.coerce.number().min(0).max(100)]).default(''), avgViews: z.union([z.literal(''), z.coerce.number().int().min(0)]).default(''), capturedOn: isoDate });
export const CategorySchema = z.object({ name: req('Category', 80), avgViews: z.coerce.number().int().min(0), posts: z.coerce.number().int().min(0).default(0) });
export const ProfileSchema = z.object({
  displayName: text(120), businessName: text(120), niche: text(80), location: text(120), platforms: z.array(text(40)).max(12), followerRange: text(40),
  revenueStreams: z.array(text(40)).max(10), hasManager: z.boolean(), businessStructure: text(60), priority: text(80)
}).partial();
export const BrandSchema = z.object({ name: req('Product name', 60).optional(), accent: z.enum(['cobalt', 'lime', 'ink', 'clay']).optional(), headlineFont: z.enum(['serif', 'sans']).optional() });
export const PrefsSchema = z.object({ dailyBriefing: z.boolean(), emailDigest: z.boolean(), pushAlerts: z.boolean(), analyticsOptIn: z.boolean() }).partial();
export const FeedbackSchema = z.object({ kind: z.enum(['feedback', 'bug']), message: req('Message', 5000), page: text(200).default(''), contactOk: z.boolean().default(false) });
export const SignUpSchema = z.object({ email: z.string().trim().toLowerCase().email('Use a valid email address.'), password: z.string().min(10, 'Use at least 10 characters.').max(128), inviteCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{6,32}$/, 'Enter the invite code from your invitation.') });
export const SignInSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(128) });
export const CsvDealRowSchema = z.object({ brand: req('brand', 120), campaign: text(200).default(''), fee: optionalMoney('fee'), stage: z.enum(STAGE_KEYS).default('paid'), date: isoDate.optional() });

export const TASK_STATUS = ['open', 'done'] as const;
export const TASK_PRIORITY = ['low', 'normal', 'high'] as const;
const optDate = z.union([isoDate, z.literal('')]).optional();
const optId = z.union([uuid, z.literal('')]).optional();
export const ContactSchema = z.object({
  name: req('Name', 120), brand: text(120).default(''), email, role: text(120).default(''), phone: text(40).default(''), notes: text(5000).default(''),
  lastContactedOn: optDate, followUpOn: optDate
});
export const ContactPatchSchema = ContactSchema.partial().extend({ id: uuid });
export const TaskSchema = z.object({
  title: req('Title', 200), notes: text(5000).default(''), dueOn: optDate, priority: z.enum(TASK_PRIORITY).default('normal'),
  dealId: optId, contactId: optId, invoiceId: optId
});
export const TaskPatchSchema = TaskSchema.partial().extend({ id: uuid, status: z.enum(TASK_STATUS).optional() });

// ---------- contracts, taxes, invoice links ----------
const optDateNull = z.union([z.literal(''), isoDate]).default('').transform(v => v || null);
export const ContractSchema = z.object({
  id: uuid,
  confirm: z.boolean().default(false),
  title: req('Title', 200), brandName: text(160).default(''),
  fee: z.union([z.literal(''), z.string(), z.number()]).default('').transform((v, ctx) => {
    if (v === '') return null;
    const c = parseMoneyToCents(v);
    if (c === null) { ctx.addIssue({ code: 'custom', message: 'Fee must be an amount like 9500 or 9,500.00.' }); return z.NEVER; }
    return c;
  }),
  paymentTerms: text(200).default(''), signedOn: optDateNull,
  usageRights: text(1000).default(''), usageStartsOn: optDateNull, usageEndsOn: optDateNull,
  exclusivity: text(1000).default(''), exclusivityStartsOn: optDateNull, exclusivityEndsOn: optDateNull,
  whitelisting: text(500).default(''), revisions: text(500).default(''), killFee: text(500).default(''), otherTerms: text(5000).default(''),
  // What confirming does: link to a partnership (existing or new), add deliverables, add reminder tasks.
  link: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('none') }),
    z.object({ mode: z.literal('existing'), dealId: uuid, updateFee: z.boolean().default(false) }),
    z.object({ mode: z.literal('new'), campaign: text(200).default('') })
  ]).default({ mode: 'none' }),
  deliverables: z.array(z.object({ name: req('Deliverable', 200), dueOn: isoDate })).max(20).default([]),
  reminders: z.boolean().default(true)
}).superRefine((v, ctx) => {
  if (v.usageStartsOn && v.usageEndsOn && v.usageEndsOn < v.usageStartsOn) ctx.addIssue({ code: 'custom', message: 'Usage end date is before its start date.', path: ['usageEndsOn'] });
  if (v.exclusivityStartsOn && v.exclusivityEndsOn && v.exclusivityEndsOn < v.exclusivityStartsOn) ctx.addIssue({ code: 'custom', message: 'Exclusivity end date is before its start date.', path: ['exclusivityEndsOn'] });
  if (v.confirm && v.link.mode === 'new' && !v.brandName) ctx.addIssue({ code: 'custom', message: 'Add the brand name to create a partnership.', path: ['brandName'] });
});
export const TaxSettingsSchema = z.object({ pct: z.coerce.number().int('Use a whole percentage.').min(0).max(60, 'Use 60% or less.') });
export const InvoiceSettingsSchema = z.object({ paymentDetails: text(1000).default(''), email });
export const ShareInvoiceSchema = z.object({ id: uuid, billToEmail: email.default('') });
