-- NETBYFRIDAY 1.0, Milestone 2: contacts and tasks as first-class records, linked to brands, partnerships and invoices.
-- Same rules as the core schema: workspace-scoped, composite foreign keys (no cross-workspace references), RLS on every table.

-- ---------- contacts ----------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid,
  name text not null check (char_length(name) between 1 and 120),
  email text not null default '' check (char_length(email) <= 254),
  role text not null default '' check (char_length(role) <= 120),
  phone text not null default '' check (char_length(phone) <= 40),
  notes text not null default '' check (char_length(notes) <= 5000),
  last_contacted_on date,
  follow_up_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, brand_id) references public.brands(workspace_id, id) on delete set null (brand_id)
);
create index contacts_workspace_brand on public.contacts(workspace_id, brand_id);
create trigger contacts_touch before update on public.contacts for each row execute function public.touch_updated_at();

-- A partnership can point at one primary contact. The old free-text contact fields stay as a fallback.
alter table public.deals add column contact_id uuid;
alter table public.deals add constraint deals_contact_fk
  foreign key (workspace_id, contact_id) references public.contacts(workspace_id, id) on delete set null (contact_id);

-- ---------- tasks ----------
create type public.task_status as enum ('open', 'done');
create type public.task_priority as enum ('low', 'normal', 'high');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  notes text not null default '' check (char_length(notes) <= 5000),
  due_on date,
  status public.task_status not null default 'open',
  priority public.task_priority not null default 'normal',
  deal_id uuid,
  contact_id uuid,
  invoice_id uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, deal_id) references public.deals(workspace_id, id) on delete set null (deal_id),
  foreign key (workspace_id, contact_id) references public.contacts(workspace_id, id) on delete set null (contact_id),
  foreign key (workspace_id, invoice_id) references public.invoices(workspace_id, id) on delete set null (invoice_id)
);
create index tasks_workspace_due on public.tasks(workspace_id, status, due_on);
create trigger tasks_touch before update on public.tasks for each row execute function public.touch_updated_at();

-- ---------- RLS ----------
do $$
declare t text;
begin
  foreach t in array array['contacts', 'tasks'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id))', t || '_member', t);
  end loop;
end $$;
revoke all on public.contacts, public.tasks from anon;

-- ---------- backfill: turn existing free-text partnership contacts into contact records ----------
insert into public.contacts (workspace_id, brand_id, name, email)
select distinct on (d.workspace_id, d.brand_id, lower(coalesce(nullif(d.contact_email, ''), d.contact_name)))
  d.workspace_id, d.brand_id, coalesce(nullif(d.contact_name, ''), d.contact_email), d.contact_email
from public.deals d
where d.contact_name <> '' or d.contact_email <> ''
order by d.workspace_id, d.brand_id, lower(coalesce(nullif(d.contact_email, ''), d.contact_name)), d.created_at;

update public.deals d set contact_id = c.id
from public.contacts c
where c.workspace_id = d.workspace_id and c.brand_id = d.brand_id and d.contact_id is null
  and lower(coalesce(nullif(c.email, ''), c.name)) = lower(coalesce(nullif(d.contact_email, ''), d.contact_name));

-- ---------- analytics: allow the new opt-in event names ----------
alter table public.analytics_events drop constraint analytics_events_event_check;
alter table public.analytics_events add constraint analytics_events_event_check check (event in (
  'onboarding_step','onboarding_completed','deal_created','deliverable_created','invoice_created',
  'payment_recorded','income_recorded','goal_set','advisor_question','draft_generated','opportunity_added',
  'csv_imported','prototype_imported','screen_view','contact_created','task_created'));
