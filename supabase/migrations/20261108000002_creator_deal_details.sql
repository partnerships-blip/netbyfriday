-- Creator-specific partnership details. Additive only; existing rows keep working with the defaults.
-- Gifted product value is non-cash: it is stored for the creator's records and is never revenue.
-- Commission terms are text; commission payouts are recorded as income when received (cash basis).
-- Payment trigger says when the payment clock starts. It is never assumed (default: not set).
alter table public.deals
  add column deal_type text not null default 'sponsored'
    check (deal_type in ('sponsored','ugc','gifted','affiliate','event','ambassador','retainer','consulting','speaking','licensing','other')),
  add column gifted_value_cents bigint not null default 0 check (gifted_value_cents >= 0 and gifted_value_cents < 100000000000),
  add column commission_terms text not null default '' check (char_length(commission_terms) <= 200),
  add column payment_schedule text not null default 'single'
    check (payment_schedule in ('single','deposit_final','installments','retainer','custom')),
  add column payment_trigger text not null default ''
    check (payment_trigger in ('','invoice_sent','contract_signed','content_approved','content_published','campaign_end','custom')),
  add column schedule_note text not null default '' check (char_length(schedule_note) <= 500);

-- Deliverable workflow: what and where, the submission and approval steps, revisions, and the live post.
alter table public.deliverables
  add column platform text not null default '' check (char_length(platform) <= 40),
  add column submit_by date,
  add column submitted_on date,
  add column published_on date,
  add column revisions smallint not null default 0 check (revisions between 0 and 50),
  add column content_url text not null default '' check (char_length(content_url) <= 500 and (content_url = '' or content_url ~* '^https?://'));
