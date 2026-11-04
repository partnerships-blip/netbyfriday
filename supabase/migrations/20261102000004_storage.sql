-- Private buckets. Object paths always start with the workspace id: {workspace_id}/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('attachments', 'attachments', false, 10485760, array['application/pdf','image/png','image/jpeg','image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/csv']),
  ('logos', 'logos', false, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create or replace function public.path_workspace(p text) returns uuid
language plpgsql immutable as $$
begin
  return (split_part(p, '/', 1))::uuid;
exception when others then
  return null;
end $$;

create policy storage_ws_select on storage.objects for select to authenticated
  using (bucket_id in ('attachments','logos') and public.is_workspace_member(public.path_workspace(name)));
create policy storage_ws_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('attachments','logos') and public.is_workspace_member(public.path_workspace(name)));
create policy storage_ws_delete on storage.objects for delete to authenticated
  using (bucket_id in ('attachments','logos') and public.is_workspace_member(public.path_workspace(name)));
