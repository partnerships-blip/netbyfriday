-- CSV import history: one row per confirmed import, so the creator can see what came in and what was skipped.
-- Holds counts and row-level problems only (no copy of the file).
create table public.import_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('deals','contacts')),
  file_name text not null default '' check (char_length(file_name) <= 200),
  total_rows integer not null default 0 check (total_rows >= 0),
  imported integer not null default 0 check (imported >= 0),
  duplicates integer not null default 0 check (duplicates >= 0),
  failed integer not null default 0 check (failed >= 0),
  problems jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index import_runs_workspace on public.import_runs(workspace_id, created_at desc);

alter table public.import_runs enable row level security;
create policy import_runs_member on public.import_runs for all to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());
revoke all on public.import_runs from anon;
