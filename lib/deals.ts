// Creator partnership vocabulary. Labels shown in forms, the deal drawer and imports.
export const DEAL_TYPES = [['sponsored', 'Sponsored content'], ['ugc', 'UGC'], ['gifted', 'Gifted collaboration'], ['affiliate', 'Affiliate partnership'],
  ['event', 'Event appearance'], ['ambassador', 'Brand ambassadorship'], ['retainer', 'Retainer'], ['consulting', 'Consulting'],
  ['speaking', 'Speaking engagement'], ['licensing', 'Licensing agreement'], ['other', 'Other']] as const;
export type DealType = typeof DEAL_TYPES[number][0];
export const DEAL_TYPE_LABEL = Object.fromEntries(DEAL_TYPES) as Record<DealType, string>;

export const SCHEDULES = [['single', 'One payment'], ['deposit_final', 'Deposit + final payment'], ['installments', 'Installments'], ['retainer', 'Monthly retainer'], ['custom', 'Custom']] as const;
export type PaymentSchedule = typeof SCHEDULES[number][0];
export const SCHEDULE_LABEL = Object.fromEntries(SCHEDULES) as Record<PaymentSchedule, string>;

// When the payment clock (Net 30 etc.) starts. Never assumed: blank until the creator sets it.
export const TRIGGERS = [['', 'Not set'], ['invoice_sent', 'When the invoice is sent'], ['contract_signed', 'When the contract is signed'], ['content_approved', 'When content is approved'],
  ['content_published', 'When content is published'], ['campaign_end', 'When the campaign ends'], ['custom', 'Other (see schedule note)']] as const;
export type PaymentTrigger = typeof TRIGGERS[number][0];
export const TRIGGER_LABEL = Object.fromEntries(TRIGGERS) as Record<PaymentTrigger, string>;
