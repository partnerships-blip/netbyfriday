-- Row-level security. Every business table is readable and writable only by members of its workspace.
-- The anon role gets nothing. Admin access goes through the aggregate functions in the previous migration.

create or replace function public.is_workspace_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where workspace_id = ws and user_id = auth.uid());
$$;
revoke all on function public.is_workspace_member(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.invite_codes enable row level security;
alter table public.beta_access enable row level security;
alter table public.admins enable row level security;
alter table public.feedback enable row level security;
alter table public.analytics_events enable row level security;
alter table public.ai_usage enable row level security;
alter table public.advisor_messages enable row level security;
alter table public.notification_reads enable row level security;

create policy ws_select on public.workspaces for select to authenticated using (public.is_workspace_member(id));
create policy ws_update on public.workspaces for update to authenticated using (public.is_workspace_member(id)) with check (public.is_workspace_member(id));
create policy wm_select on public.workspace_members for select to authenticated using (user_id = auth.uid());
create policy cp_select on public.creator_profiles for select to authenticated using (public.is_workspace_member(workspace_id));
create policy cp_update on public.creator_profiles for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy us_select on public.user_settings for select to authenticated using (user_id = auth.uid());
create policy us_update on public.user_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ba_select on public.beta_access for select to authenticated using (user_id = auth.uid());
create policy ad_select on public.admins for select to authenticated using (user_id = auth.uid());
-- invite_codes: no policies; only security-definer functions touch it.

create policy fb_insert on public.feedback for insert to authenticated with check (user_id = auth.uid());
create policy fb_select on public.feedback for select to authenticated using (user_id = auth.uid());
create policy ae_insert on public.analytics_events for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.user_settings s where s.user_id = auth.uid() and s.analytics_opt_in));
create policy au_insert on public.ai_usage for insert to authenticated with check (user_id = auth.uid());
create policy au_select on public.ai_usage for select to authenticated using (user_id = auth.uid());
create policy am_select on public.advisor_messages for select to authenticated using (public.is_workspace_member(workspace_id) and user_id = auth.uid());
create policy am_insert on public.advisor_messages for insert to authenticated with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());
create policy am_delete on public.advisor_messages for delete to authenticated using (public.is_workspace_member(workspace_id) and user_id = auth.uid());
create policy nr_all on public.notification_reads for all to authenticated
  using (public.is_workspace_member(workspace_id) and user_id = auth.uid())
  with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['brands','deals','deliverables','invoices','payments','income_entries','expenses',
                           'opportunities','audience_snapshots','content_categories','attachments','checklist_state']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id))', t || '_member', t);
  end loop;
end $$;

revoke all on all tables in schema public from anon;
