-- Invite-only registration, feedback, opt-in analytics, admin roles.

create table public.invite_codes (
  code text primary key check (code ~ '^[A-Z0-9-]{6,32}$'),
  max_uses int not null default 1 check (max_uses between 1 and 500),
  uses int not null default 0 check (uses >= 0),
  expires_at timestamptz,
  note text not null default '' check (char_length(note) <= 200),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (uses <= max_uses)
);

create table public.beta_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null references public.invite_codes(code),
  granted_at timestamptz not null default now()
);

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('feedback','bug')),
  message text not null check (char_length(message) between 1 and 5000),
  page text not null default '' check (char_length(page) <= 200),
  user_agent text not null default '' check (char_length(user_agent) <= 400),
  contact_ok boolean not null default false,
  status text not null default 'new' check (status in ('new','triaged','resolved')),
  created_at timestamptz not null default now()
);

-- Product analytics: event names only, no business data. Inserted only when the user opted in.
create table public.analytics_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event text not null check (event in (
    'onboarding_step','onboarding_completed','deal_created','deliverable_created','invoice_created',
    'payment_recorded','income_recorded','goal_set','advisor_question','draft_generated','opportunity_added',
    'csv_imported','prototype_imported','screen_view')),
  screen text check (screen is null or char_length(screen) <= 40),
  created_at timestamptz not null default now()
);
create index analytics_events_time on public.analytics_events(created_at);

-- New users must present a valid invite code (passed as user metadata at sign-up).
-- Runs inside the auth.users insert transaction, so an invalid code aborts the sign-up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_code text := upper(trim(coalesce(new.raw_user_meta_data->>'invite_code', ''))); v_ws uuid;
begin
  update public.invite_codes set uses = uses + 1
   where code = v_code and uses < max_uses and (expires_at is null or expires_at > now());
  if not found then raise exception 'INVITE_INVALID' using errcode = 'P0001'; end if;
  insert into public.beta_access(user_id, code) values (new.id, v_code);
  insert into public.workspaces(owner_id) values (new.id) returning id into v_ws;
  insert into public.workspace_members(workspace_id, user_id) values (v_ws, new.id);
  insert into public.creator_profiles(workspace_id) values (v_ws);
  insert into public.user_settings(user_id) values (new.id);
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Aggregate beta metrics only. Never returns earnings, contracts, or business records.
create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN' using errcode = '42501'; end if;
  select jsonb_build_object(
    'users', (select count(*) from public.beta_access),
    'onboarding_completed', (select count(*) from public.creator_profiles where onboarding_completed_at is not null),
    'onboarding_by_step', (select coalesce(jsonb_object_agg(onboarding_step, n), '{}') from (select onboarding_step, count(*) n from public.creator_profiles where onboarding_completed_at is null group by 1) s),
    'active_7d', (select count(*) from auth.users u join public.beta_access b on b.user_id = u.id where u.last_sign_in_at > now() - interval '7 days'),
    'workspaces_with_deals', (select count(distinct workspace_id) from public.deals),
    'workspaces_with_invoices', (select count(distinct workspace_id) from public.invoices),
    'workspaces_with_payments', (select count(distinct workspace_id) from public.payments),
    'workspaces_using_advisor', (select count(distinct workspace_id) from public.advisor_messages),
    'ai_requests_7d', (select count(*) from public.ai_usage where created_at > now() - interval '7 days'),
    'events_7d', (select coalesce(jsonb_object_agg(event, n), '{}') from (select event, count(*) n from public.analytics_events where created_at > now() - interval '7 days' group by 1) e),
    'feedback_open', (select count(*) from public.feedback where status <> 'resolved')
  ) into result;
  return result;
end $$;

-- Feedback is written by users for the team. Email is only included when the user allowed contact.
create or replace function public.admin_feedback(p_limit int default 50) returns table (
  id uuid, kind text, message text, page text, status text, created_at timestamptz, contact_email text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN' using errcode = '42501'; end if;
  return query
    select f.id, f.kind, f.message, f.page, f.status, f.created_at,
           case when f.contact_ok then u.email::text else null end
      from public.feedback f join auth.users u on u.id = f.user_id
     order by f.created_at desc limit least(p_limit, 200);
end $$;

create or replace function public.admin_set_feedback_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN' using errcode = '42501'; end if;
  update public.feedback set status = p_status where id = p_id;
end $$;

create or replace function public.admin_invites() returns setof public.invite_codes
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN' using errcode = '42501'; end if;
  return query select * from public.invite_codes order by created_at desc;
end $$;

create or replace function public.admin_create_invite(p_code text, p_max_uses int, p_expires_at timestamptz, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN' using errcode = '42501'; end if;
  insert into public.invite_codes(code, max_uses, expires_at, note, created_by)
  values (upper(trim(p_code)), p_max_uses, p_expires_at, coalesce(p_note, ''), auth.uid());
end $$;

revoke all on function public.admin_overview(), public.admin_feedback(int), public.admin_set_feedback_status(uuid, text),
  public.admin_invites(), public.admin_create_invite(text, int, timestamptz, text) from public, anon;
grant execute on function public.admin_overview(), public.admin_feedback(int), public.admin_set_feedback_status(uuid, text),
  public.admin_invites(), public.admin_create_invite(text, int, timestamptz, text), public.is_admin() to authenticated;
