-- Delete my account: removes the signed-in user's workspace, every record in it, their waitlist entry and their login.
-- Security definer because signed agreements and payments are locked against the app's own deletes; the only way in is
-- through this function, for the caller's own account, after they type their account email to confirm.
-- Stored files (contracts, logos, content) are removed by the server action before this runs, under the user's own storage policies.
create or replace function public.delete_my_account(p_confirm_email text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
  em text;
  ws uuid;
begin
  if uid is null then raise exception 'NOT_SIGNED_IN' using errcode = '28000'; end if;
  select email into em from auth.users where id = uid;
  if p_confirm_email is null or em is null or lower(btrim(p_confirm_email)) <> lower(em) then
    raise exception 'DELETE_CONFIRM_MISMATCH' using errcode = '22023';
  end if;
  select id into ws from public.workspaces where owner_id = uid;
  if ws is not null then
    -- Order matters: payments hold their invoices, and partnerships hold their brands (on delete restrict).
    delete from public.payments where workspace_id = ws;
    delete from public.deals where workspace_id = ws;
    delete from public.workspaces where id = ws;     -- cascades to every other workspace table, signed agreements included
  end if;
  delete from public.waitlist where lower(email) = lower(em);
  delete from auth.users where id = uid;              -- cascades to settings, feedback, analytics, AI usage, beta access
end $$;
revoke all on function public.delete_my_account(text) from public;
revoke all on function public.delete_my_account(text) from anon;
grant execute on function public.delete_my_account(text) to authenticated;
