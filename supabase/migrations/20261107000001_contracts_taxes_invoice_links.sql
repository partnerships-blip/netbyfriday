-- Contracts (uploaded, read by the AI, confirmed by the creator), a tax set-aside setting, and shareable invoice links.
-- Same rules as the core schema: workspace-scoped, composite foreign keys, RLS on every table, money in integer cents.
-- All three features ship behind flags (contracts, taxes, invoiceLinks) and are invisible until a deployment turns them on.

-- ---------- contracts ----------
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deal_id uuid,
  status text not null default 'review' check (status in ('review', 'confirmed')),
  title text not null default '' check (char_length(title) <= 200),
  file_name text not null default '' check (char_length(file_name) <= 200),
  storage_path text unique,                         -- private 'attachments' bucket, {workspace_id}/contracts/...
  extracted jsonb not null default '{}'::jsonb,     -- what the AI proposed, with the contract wording it came from
  brand_name text not null default '' check (char_length(brand_name) <= 160),
  fee_cents bigint check (fee_cents is null or (fee_cents >= 0 and fee_cents < 100000000000)),
  payment_terms text not null default '' check (char_length(payment_terms) <= 200),
  signed_on date,
  usage_rights text not null default '' check (char_length(usage_rights) <= 1000),
  usage_starts_on date,
  usage_ends_on date,
  exclusivity text not null default '' check (char_length(exclusivity) <= 1000),
  exclusivity_starts_on date,
  exclusivity_ends_on date,
  whitelisting text not null default '' check (char_length(whitelisting) <= 500),
  revisions text not null default '' check (char_length(revisions) <= 500),
  kill_fee text not null default '' check (char_length(kill_fee) <= 500),
  other_terms text not null default '' check (char_length(other_terms) <= 5000),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  check (usage_ends_on is null or usage_starts_on is null or usage_ends_on >= usage_starts_on),
  check (exclusivity_ends_on is null or exclusivity_starts_on is null or exclusivity_ends_on >= exclusivity_starts_on),
  foreign key (workspace_id, deal_id) references public.deals(workspace_id, id) on delete set null (deal_id)
);
create index contracts_workspace on public.contracts(workspace_id, status);
create trigger contracts_touch before update on public.contracts for each row execute function public.touch_updated_at();

alter table public.contracts enable row level security;
create policy contracts_member on public.contracts for all to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
revoke all on public.contracts from anon;

-- ---------- tax set-aside (a planning percentage the creator chooses; not tax advice) ----------
alter table public.workspaces add column tax_set_aside_pct smallint not null default 25 check (tax_set_aside_pct between 0 and 60);
-- What the creator wants printed on invoices: how to pay them (free text they write), and a reply-to email.
alter table public.workspaces add column invoice_payment_details text not null default '' check (char_length(invoice_payment_details) <= 1000);
alter table public.workspaces add column invoice_email text not null default '' check (char_length(invoice_email) <= 254);
grant update (tax_set_aside_pct, invoice_payment_details, invoice_email) on public.workspaces to authenticated;

-- ---------- shareable invoice links ----------
-- A link is an unguessable token. Turning sharing off clears it, which kills the old link.
alter table public.invoices add column share_token uuid unique;
alter table public.invoices add column sent_at timestamptz;
alter table public.invoices add column bill_to_email text not null default '' check (char_length(bill_to_email) <= 254);

-- The only way to read an invoice without signing in: exactly one invoice, by token, with just what belongs on the invoice.
create or replace function public.shared_invoice(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'number', v.number, 'client_name', v.client_name, 'description', v.description, 'amount_cents', v.amount_cents,
    'issued_on', v.issued_on, 'due_on', v.due_on, 'terms', v.terms, 'voided', v.voided_at is not null,
    'paid_cents', coalesce((select sum(p.amount_cents) from public.payments p where p.workspace_id = v.workspace_id and p.invoice_id = v.id), 0),
    'from_name', coalesce(nullif(cp.business_name, ''), nullif(cp.display_name, ''), w.brand_name),
    'from_location', cp.location, 'from_email', w.invoice_email, 'payment_details', w.invoice_payment_details
  )
  from public.invoices v
  join public.workspaces w on w.id = v.workspace_id
  left join public.creator_profiles cp on cp.workspace_id = v.workspace_id
  where p_token is not null and v.share_token = p_token and v.voided_at is null
  limit 1;
$$;
revoke all on function public.shared_invoice(uuid) from public;
grant execute on function public.shared_invoice(uuid) to anon, authenticated;

-- ---------- AI usage: contract reading counts toward the same per-user hourly cap ----------
alter table public.ai_usage drop constraint ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check check (kind in ('advisor', 'draft', 'contract'));
