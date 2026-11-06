// Shared domain types. Amounts are integer cents; dates are 'YYYY-MM-DD'.

export type Stream = 'brand' | 'affiliate' | 'events' | 'digital' | 'appearances' | 'other';
export type Stage = 'lead' | 'pitching' | 'negotiating' | 'contracted' | 'in_progress' | 'completed' | 'paid' | 'lost';
export type DeliverableStatus = 'not_started' | 'in_progress' | 'in_review' | 'approved' | 'posted' | 'scheduled';
export type OpportunityStatus = 'new' | 'saved' | 'pitched' | 'dismissed';
export type TaskStatus = 'open' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high';

export interface Deliverable { id: string; dealId: string; name: string; dueOn: string; status: DeliverableStatus; notes: string;
  platform?: string; submitBy?: string | null; submittedOn?: string | null; publishedOn?: string | null; revisions?: number; contentUrl?: string }

export interface Deal {
  id: string; brandId: string; brandName: string; agency: string; contactName: string; contactEmail: string;
  campaign: string; description: string; feeCents: number; feeIsEstimate: boolean; stage: Stage; platforms: string[];
  contentCategory: string; contractStatus: string; usageRights: string; exclusivity: string; paymentTerms: string; notes: string;
  startedOn: string; completedOn: string | null; lastContactOn: string; deliverables: Deliverable[]; contactId?: string | null;
  attachments?: { id: string; fileName: string }[];
  /** Creator deal details. Gifted value is non-cash and never revenue. */
  dealType?: import('./deals').DealType; giftedValueCents?: number; commissionTerms?: string;
  paymentSchedule?: import('./deals').PaymentSchedule; paymentTrigger?: import('./deals').PaymentTrigger; scheduleNote?: string;
}

export interface Invoice {
  id: string; number: string; dealId: string | null; clientName: string; description: string; stream: Stream;
  amountCents: number; issuedOn: string; dueOn: string; terms: string; voidedAt: string | null; shareToken?: string | null; sentAt?: string | null; billToEmail?: string;
}
export interface Payment { id: string; invoiceId: string; amountCents: number; receivedOn: string; note: string }
export interface IncomeEntry { id: string; stream: Stream; amountCents: number; receivedOn: string; counterparty: string; description: string }
export interface Expense { id: string; category: string; amountCents: number; spentOn: string; note: string }
export interface Opportunity { id: string; name: string; category: string; location: string; fit: string; source: string; angle: string; status: OpportunityStatus }
export interface AudienceSnapshot { id: string; platform: string; followers: number; engagementRate: number | null; avgViews: number | null; capturedOn: string }
export interface Contact {
  id: string; brandId: string | null; brandName: string | null; name: string; email: string; role: string; phone: string; notes: string;
  lastContactedOn: string | null; followUpOn: string | null;
}
export interface Task {
  id: string; title: string; notes: string; dueOn: string | null; status: TaskStatus; priority: TaskPriority;
  dealId: string | null; contactId: string | null; invoiceId: string | null; completedAt: string | null;
}
export interface ContentCategory { id: string; name: string; avgViews: number; posts: number }

export interface CoreInput {
  today: string;
  deals: Deal[];
  invoices: Invoice[];
  payments: Payment[];
  income: IncomeEntry[];
  expenses: Expense[];
  goals: { monthlyCents: number; annualCents: number };
  opportunities: Opportunity[];
  audience: AudienceSnapshot[];
  categories: ContentCategory[];
  contacts?: Contact[];
  tasks?: Task[];
}

export interface Profile {
  displayName: string; businessName: string; niche: string; location: string; platforms: string[]; followerRange: string;
  revenueStreams: string[]; hasManager: boolean; businessStructure: string; priority: string;
  onboardingStep: number; onboardingCompletedAt: string | null;
}

export interface Brand { name: string; accent: 'cobalt' | 'lime' | 'ink' | 'clay'; headlineFont: 'serif' | 'sans'; logoUrl: string | null }

export type Evidence = 'verified' | 'estimate' | 'suggested' | 'insufficient';
export interface RecordRef { type: 'deal' | 'invoice' | 'payment' | 'income' | 'expense' | 'deliverable' | 'metric' | 'opportunity' | 'contact' | 'task'; id: string; label: string }

export interface Insight {
  id: string; category: 'Revenue' | 'Partnership' | 'Payment' | 'Growth' | 'Risk' | 'Getting started';
  title: string; evidence: Evidence; data: string[]; explain: string; action: string; actionLabel: string; target: string;
  draftKind?: string; dealId?: string; invoiceId?: string; related: RecordRef[];
  scores: { impact: number; urgency: number; confidence: number; goal: number }; score: number;
}

export type ActionResult = { ok: true; id?: string; message?: string } | { ok: false; error: string };

export interface Contract {
  id: string; dealId: string | null; status: 'review' | 'confirmed'; title: string; fileName: string; hasFile: boolean;
  brandName: string; feeCents: number | null; paymentTerms: string; signedOn: string | null;
  usageRights: string; usageStartsOn: string | null; usageEndsOn: string | null;
  exclusivity: string; exclusivityStartsOn: string | null; exclusivityEndsOn: string | null;
  whitelisting: string; revisions: string; killFee: string; otherTerms: string;
  extracted: ContractExtraction | null; confirmedAt: string | null; createdAt: string;
}
/** One proposed value from the contract, with the wording it came from. `found` = the quote was located in the text. */
export interface ExtractedField { value: string; quote: string; found?: boolean }
export interface ContractExtraction {
  source: 'pdf' | 'text';
  fields: Partial<Record<'title' | 'brandName' | 'fee' | 'paymentTerms' | 'signedOn' | 'usageRights' | 'usageDays' | 'usageStartsOn' | 'usageEndsOn'
    | 'exclusivity' | 'exclusivityDays' | 'exclusivityStartsOn' | 'exclusivityEndsOn' | 'whitelisting' | 'revisions' | 'killFee' | 'otherTerms', ExtractedField>>;
  deliverables: { name: string; dueOn: string | null; quote: string; found?: boolean }[];
  warnings: string[];
}
