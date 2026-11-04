-- Creator Intelligence: core schema.
-- Money is stored as integer cents (bigint). Dates are calendar dates in the workspace's timezone.
-- Revenue is cash basis: only rows in `payments` and `income_entries` are revenue.
-- Child tables use composite (workspace_id, id) foreign keys so a record can never reference another workspace's data.

create extension if not exists pgcrypto;

-- NETBYFRIDAY pipeline: Lead → Pitching → Negotiating → Contracted → In Progress → Completed → Paid (+ Lost).
create type public.deal_stage as enum ('lead','pitching','negotiating','contracted','in_progress','completed','paid','lost');
create type public.deliverable_status as enum ('not_started','in_progress','in_review','approved','posted','scheduled');
create type public.revenue_stream as enum ('brand','affiliate','events','digital','appearances','other');
create type public.opportunity_status as enum ('new','saved','pitched','dismissed');

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- workspaces ----------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  brand_name text not null default 'netbyfriday' check (char_length(brand_name) between 1 and 60),
  accent text not null default 'cobalt' check (accent in ('cobalt','lime','ink','clay')),
  headline_font text not null default 'serif' check (headline_font in ('serif','sans')),
  logo_path text,
  monthly_goal_cents bigint not null default 0 check (monthly_goal_cents >= 0),
  annual_goal_cents bigint not null default 0 check (annual_goal_cents >= 0),
  timezone text not null default 'America/Chicago' check (char_length(timezone) <= 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger workspaces_touch before update on public.workspaces for each row execute function public.touch_updated_at();

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner')),
  primary key (workspace_id, user_id)
);
create index workspace_members_user on public.workspace_members(user_id);

create table public.creator_profiles (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  business_name text not null default '' check (char_length(business_name) <= 120),
  niche text not null default '' check (char_length(niche) <= 80),
  location text not null default '' check (char_length(location) <= 120),
  platforms text[] not null default '{}',
  follower_range text not null default '',
  revenue_streams text[] not null default '{}',
  has_manager boolean not null default false,
  business_structure text not null default '',
  priority text not null default '',
  onboarding_step int not null default 0 check (onboarding_step between 0 and 10),
  onboarding_completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create trigger creator_profiles_touch before update on public.creator_profiles for each row execute function public.touch_updated_at();

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_briefing boolean not null default true,
  email_digest boolean not null default false,
  push_alerts boolean not null default false,
  analytics_opt_in boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------- business records ----------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  notes text not null default '' check (char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  unique (workspace_id, id)
);
create unique index brands_workspace_name on public.brands (workspace_id, lower(name));

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null,
  agency text not null default '' check (char_length(agency) <= 120),
  contact_name text not null default '' check (char_length(contact_name) <= 120),
  contact_email text not null default '' check (char_length(contact_email) <= 254),
  campaign text not null default '' check (char_length(campaign) <= 200),
  description text not null default '' check (char_length(description) <= 5000),
  fee_cents bigint not null default 0 check (fee_cents >= 0 and fee_cents < 100000000000),
  fee_is_estimate boolean not null default false,
  stage public.deal_stage not null default 'lead',
  platforms text[] not null default '{}',
  content_category text not null default '' check (char_length(content_category) <= 80),
  contract_status text not null default '' check (char_length(contract_status) <= 200),
  usage_rights text not null default '' check (char_length(usage_rights) <= 500),
  exclusivity text not null default '' check (char_length(exclusivity) <= 500),
  payment_terms text not null default '' check (char_length(payment_terms) <= 200),
  notes text not null default '' check (char_length(notes) <= 10000),
  started_on date not null default current_date,
  completed_on date,
  last_contact_on date not null default current_date,
  import_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, import_ref),
  foreign key (workspace_id, brand_id) references public.brands(workspace_id, id) on delete restrict
);
create index deals_workspace_stage on public.deals(workspace_id, stage);
create trigger deals_touch before update on public.deals for each row execute function public.touch_updated_at();

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deal_id uuid not null,
  name text not null check (char_length(name) between 1 and 200),
  due_on date not null,
  status public.deliverable_status not null default 'not_started',
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  foreign key (workspace_id, deal_id) references public.deals(workspace_id, id) on delete cascade
);
create index deliverables_deal on public.deliverables(workspace_id, deal_id);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  number text not null check (char_length(number) between 1 and 40),
  deal_id uuid,
  client_name text not null check (char_length(client_name) between 1 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  stream public.revenue_stream not null default 'brand',
  amount_cents bigint not null check (amount_cents > 0 and amount_cents < 100000000000),
  issued_on date not null,
  due_on date not null,
  terms text not null default 'Net 30' check (char_length(terms) <= 60),
  voided_at timestamptz,
  import_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, number),
  unique (workspace_id, import_ref),
  check (due_on >= issued_on),
  foreign key (workspace_id, deal_id) references public.deals(workspace_id, id) on delete set null (deal_id)
);
create trigger invoices_touch before update on public.invoices for each row execute function public.touch_updated_at();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_id uuid not null,
  amount_cents bigint not null check (amount_cents > 0),
  received_on date not null,
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  foreign key (workspace_id, invoice_id) references public.invoices(workspace_id, id) on delete restrict
);
create index payments_invoice on public.payments(workspace_id, invoice_id);

-- Direct income that has no invoice (affiliate payouts, ticket sales, product sales).
-- Deliberately has no invoice_id column: invoiced money is recorded only as a payment, never here.
create table public.income_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stream public.revenue_stream not null,
  amount_cents bigint not null check (amount_cents > 0 and amount_cents < 100000000000),
  received_on date not null,
  counterparty text not null default '' check (char_length(counterparty) <= 160),
  description text not null default '' check (char_length(description) <= 500),
  import_ref text,
  created_at timestamptz not null default now(),
  unique (workspace_id, import_ref)
);
create index income_workspace_date on public.income_entries(workspace_id, received_on);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category text not null check (char_length(category) between 1 and 120),
  amount_cents bigint not null check (amount_cents > 0),
  spent_on date not null,
  note text not null default '' check (char_length(note) <= 500),
  import_ref text,
  created_at timestamptz not null default now(),
  unique (workspace_id, import_ref)
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  category text not null check (char_length(category) <= 80),
  location text not null default '' check (char_length(location) <= 120),
  fit text not null default '' check (char_length(fit) <= 2000),
  source text not null default 'Added by you' check (char_length(source) <= 300),
  angle text not null default '' check (char_length(angle) <= 2000),
  status public.opportunity_status not null default 'new',
  import_ref text,
  created_at timestamptz not null default now(),
  unique (workspace_id, import_ref)
);

create table public.audience_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  platform text not null check (char_length(platform) between 1 and 40),
  followers int not null check (followers >= 0),
  engagement_rate numeric(5,2) check (engagement_rate is null or engagement_rate between 0 and 100),
  avg_views int check (avg_views is null or avg_views >= 0),
  captured_on date not null,
  unique (workspace_id, platform, captured_on)
);

create table public.content_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  avg_views int not null default 0 check (avg_views >= 0),
  posts int not null default 0 check (posts >= 0),
  unique (workspace_id, name)
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deal_id uuid not null,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) <= 200),
  mime_type text not null,
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now(),
  foreign key (workspace_id, deal_id) references public.deals(workspace_id, id) on delete cascade
);

create table public.advisor_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) <= 20000),
  payload jsonb,
  created_at timestamptz not null default now()
);
create index advisor_messages_ws on public.advisor_messages(workspace_id, created_at);

create table public.ai_usage (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('advisor','draft')),
  created_at timestamptz not null default now()
);
create index ai_usage_user_time on public.ai_usage(user_id, created_at);

create table public.notification_reads (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (char_length(key) <= 120),
  read_at timestamptz not null default now(),
  primary key (workspace_id, user_id, key)
);

create table public.checklist_state (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  key text not null check (char_length(key) <= 120),
  done_on date not null,
  primary key (workspace_id, key)
);

-- ---------- financial integrity ----------
-- Payments can never exceed the invoice amount and cannot be added to a void invoice.
create or replace function public.guard_payment() returns trigger language plpgsql as $$
declare v_amount bigint; v_void timestamptz; v_paid bigint;
begin
  select amount_cents, voided_at into v_amount, v_void
    from public.invoices where id = new.invoice_id and workspace_id = new.workspace_id for update;
  if v_void is not null then raise exception 'INVOICE_VOID' using errcode = '23514'; end if;
  select coalesce(sum(amount_cents), 0) into v_paid from public.payments
    where invoice_id = new.invoice_id and id <> new.id;
  if v_paid + new.amount_cents > v_amount then
    raise exception 'PAYMENT_EXCEEDS_BALANCE' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger payments_guard before insert or update on public.payments for each row execute function public.guard_payment();

-- Invoice amount cannot drop below what has been paid; invoices with payments cannot be voided.
create or replace function public.guard_invoice() returns trigger language plpgsql as $$
declare v_paid bigint;
begin
  select coalesce(sum(amount_cents), 0) into v_paid from public.payments where invoice_id = new.id;
  if new.amount_cents < v_paid then raise exception 'AMOUNT_BELOW_PAID' using errcode = '23514'; end if;
  if new.voided_at is not null and old.voided_at is null and v_paid > 0 then
    raise exception 'VOID_WITH_PAYMENTS' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger invoices_guard before update on public.invoices for each row execute function public.guard_invoice();
