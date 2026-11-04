// Shared domain types. Amounts are integer cents; dates are 'YYYY-MM-DD'.

export type Stream = 'brand' | 'affiliate' | 'events' | 'digital' | 'appearances' | 'other';
export type Stage = 'lead' | 'pitching' | 'negotiating' | 'contracted' | 'in_progress' | 'completed' | 'paid' | 'lost';
export type DeliverableStatus = 'not_started' | 'in_progress' | 'in_review' | 'approved' | 'posted' | 'scheduled';
export type OpportunityStatus = 'new' | 'saved' | 'pitched' | 'dismissed';

export interface Deliverable { id: string; dealId: string; name: string; dueOn: string; status: DeliverableStatus; notes: string }

export interface Deal {
  id: string; brandId: string; brandName: string; agency: string; contactName: string; contactEmail: string;
  campaign: string; description: string; feeCents: number; feeIsEstimate: boolean; stage: Stage; platforms: string[];
  contentCategory: string; contractStatus: string; usageRights: string; exclusivity: string; paymentTerms: string; notes: string;
  startedOn: string; completedOn: string | null; lastContactOn: string; deliverables: Deliverable[];
  attachments?: { id: string; fileName: string }[];
}

export interface Invoice {
  id: string; number: string; dealId: string | null; clientName: string; description: string; stream: Stream;
  amountCents: number; issuedOn: string; dueOn: string; terms: string; voidedAt: string | null;
}
export interface Payment { id: string; invoiceId: string; amountCents: number; receivedOn: string; note: string }
export interface IncomeEntry { id: string; stream: Stream; amountCents: number; receivedOn: string; counterparty: string; description: string }
export interface Expense { id: string; category: string; amountCents: number; spentOn: string; note: string }
export interface Opportunity { id: string; name: string; category: string; location: string; fit: string; source: string; angle: string; status: OpportunityStatus }
export interface AudienceSnapshot { id: string; platform: string; followers: number; engagementRate: number | null; avgViews: number | null; capturedOn: string }
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
}

export interface Profile {
  displayName: string; businessName: string; niche: string; location: string; platforms: string[]; followerRange: string;
  revenueStreams: string[]; hasManager: boolean; businessStructure: string; priority: string;
  onboardingStep: number; onboardingCompletedAt: string | null;
}

export interface Brand { name: string; accent: 'cobalt' | 'lime' | 'ink' | 'clay'; headlineFont: 'serif' | 'sans'; logoUrl: string | null }

export type Evidence = 'verified' | 'estimate' | 'suggested' | 'insufficient';
export interface RecordRef { type: 'deal' | 'invoice' | 'payment' | 'income' | 'expense' | 'deliverable' | 'metric' | 'opportunity'; id: string; label: string }

export interface Insight {
  id: string; category: 'Revenue' | 'Partnership' | 'Payment' | 'Growth' | 'Risk' | 'Getting started';
  title: string; evidence: Evidence; data: string[]; explain: string; action: string; actionLabel: string; target: string;
  draftKind?: string; dealId?: string; invoiceId?: string; related: RecordRef[];
  scores: { impact: number; urgency: number; confidence: number; goal: number }; score: number;
}

export type ActionResult = { ok: true; id?: string; message?: string } | { ok: false; error: string };
