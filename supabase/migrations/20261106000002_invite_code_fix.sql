-- Fix: on Supabase, pgcrypto lives in the "extensions" schema, so gen_random_bytes() was not visible to this
-- security-definer function (search_path = public). Use the built-in gen_random_uuid() instead.
create or replace function public.admin_invite_waitlist(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_code text; v_existing text;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN' using errcode = '42501'; end if;
  select invite_code into v_existing from public.waitlist where id = p_id;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if v_existing is not null then return v_existing; end if;
  v_code := 'NBF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.invite_codes (code, max_uses, expires_at, note, created_by)
  values (v_code, 1, now() + interval '30 days', 'Waitlist: ' || (select email from public.waitlist where id = p_id), auth.uid());
  update public.waitlist set invited_at = now(), invite_code = v_code where id = p_id;
  return v_code;
end $$;
