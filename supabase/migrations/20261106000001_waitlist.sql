-- NETBYFRIDAY 1.0, Milestone 4: public waitlist and one-click invites.
-- Nobody reads or writes the table directly. Visitors join through join_waitlist(); admins list and invite through
-- security-definer functions that check is_admin(). Invites are single-use codes the founder sends from their own email.

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name text not null default '' check (char_length(name) <= 120),
  handle text not null default '' check (char_length(handle) <= 80),
  creator_type text not null default '' check (char_length(creator_type) <= 80),
  source text not null default '' check (char_length(source) <= 80),
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  invited_at timestamptz,
  invite_code text references public.invite_codes(code) on delete set null
);
create unique index waitlist_email on public.waitlist (lower(email));
alter table public.waitlist enable row level security;   -- no policies: no direct access for anon or authenticated
revoke all on public.waitlist from anon, authenticated;

-- Returns 'joined' or 'already'. Consent is required. Callable without signing in.
create or replace function public.join_waitlist(p_email text, p_name text, p_handle text, p_creator_type text, p_source text, p_consent boolean)
returns text language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(coalesce(p_email, '')));
begin
  if not coalesce(p_consent, false) then raise exception 'CONSENT_REQUIRED' using errcode = '22023'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then raise exception 'EMAIL_INVALID' using errcode = '22023'; end if;
  if exists (select 1 from public.waitlist where lower(email) = v_email) then return 'already'; end if;
  insert into public.waitlist (email, name, handle, creator_type, source, consent_at)
  values (v_email, left(trim(coalesce(p_name, '')), 120), left(trim(coalesce(p_handle, '')), 80), left(trim(coalesce(p_creator_type, '')), 80), left(trim(coalesce(p_source, '')), 80), now());
  return 'joined';
exception when unique_violation then return 'already';
end $$;

create or replace function public.admin_waitlist(p_limit int default 200) returns setof public.waitlist
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN' using errcode = '42501'; end if;
  return query select * from public.waitlist order by invited_at nulls first, created_at limit least(greatest(p_limit, 1), 1000);
end $$;

-- Creates a single-use invite code for one waitlist entry (or returns the one already issued). Returns the code.
create or replace function public.admin_invite_waitlist(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_code text; v_existing text;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN' using errcode = '42501'; end if;
  select invite_code into v_existing from public.waitlist where id = p_id;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if v_existing is not null then return v_existing; end if;
  v_code := 'NBF-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  insert into public.invite_codes (code, max_uses, expires_at, note, created_by)
  values (v_code, 1, now() + interval '30 days', 'Waitlist: ' || (select email from public.waitlist where id = p_id), auth.uid());
  update public.waitlist set invited_at = now(), invite_code = v_code where id = p_id;
  return v_code;
end $$;

revoke all on function public.join_waitlist(text, text, text, text, text, boolean), public.admin_waitlist(int), public.admin_invite_waitlist(uuid) from public;
grant execute on function public.join_waitlist(text, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.admin_waitlist(int), public.admin_invite_waitlist(uuid) to authenticated;
