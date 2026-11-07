-- Content Intelligence: a library of the creator's published content, private media, performance snapshots
-- (never overwritten: each has its own measured date and period), AI reports, follow-up conversations,
-- saved ideas, and links to partnerships and income. Every table is workspace-scoped with RLS.
-- Rollback: see docs/CONTENT_INTELLIGENCE.md ("Rollback").

create unique index if not exists income_entries_ws_id on public.income_entries (workspace_id, id);
create unique index if not exists deliverables_ws_id on public.deliverables (workspace_id, id);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  platform text not null default 'instagram' check (platform in ('instagram','tiktok','youtube','other')),
  format text not null default 'reel' check (format in ('reel','post','carousel','story','video','short','live','other')),
  url text not null default '' check (char_length(url) <= 500 and (url = '' or url ~* '^https://')),
  published_on date,
  category text not null default '' check (char_length(category) <= 80),
  goal text not null default '' check (char_length(goal) <= 80),
  caption text not null default '' check (char_length(caption) <= 5000),
  description text not null default '' check (char_length(description) <= 5000),
  transcript text not null default '' check (char_length(transcript) <= 20000),
  duration_seconds int check (duration_seconds between 0 and 36000),
  deliverable_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, deliverable_id) references public.deliverables(workspace_id, id) on delete set null (deliverable_id)
);
create index content_items_ws on public.content_items (workspace_id, published_on desc nulls last, created_at desc);
create trigger content_items_touch before update on public.content_items for each row execute function public.touch_updated_at();

-- Files in the private 'content' bucket: the original media, frames sampled from a video, insight screenshots.
create table public.content_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_id uuid not null,
  kind text not null check (kind in ('media','frame','insight')),
  path text not null unique check (char_length(path) <= 300),
  mime text not null check (mime in ('video/mp4','video/quicktime','image/jpeg','image/png','image/webp')),
  bytes bigint not null check (bytes > 0 and bytes <= 52428800),
  frame_at_seconds numeric(8,2),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, content_id) references public.content_items(workspace_id, id) on delete cascade
);
create index content_assets_content on public.content_assets (content_id, kind);

-- Performance measured at a point in time. Never updated in place: a new measurement is a new row.
create table public.content_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_id uuid not null,
  measured_on date not null,
  period text not null check (period in ('24h','48h','7d','30d','lifetime','custom')),
  period_note text not null default '' check (char_length(period_note) <= 80),
  views bigint check (views >= 0), reach bigint check (reach >= 0), likes bigint check (likes >= 0),
  comments bigint check (comments >= 0), shares bigint check (shares >= 0), saves bigint check (saves >= 0),
  profile_visits bigint check (profile_visits >= 0), link_clicks bigint check (link_clicks >= 0), leads bigint check (leads >= 0),
  avg_watch_seconds numeric(8,2) check (avg_watch_seconds >= 0),
  skip_rate numeric(5,2) check (skip_rate between 0 and 100),
  retention_pct numeric(5,2) check (retention_pct between 0 and 100),
  source text not null default 'creator' check (source in ('creator','screenshot')),
  insight_asset_id uuid,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, content_id) references public.content_items(workspace_id, id) on delete cascade,
  foreign key (workspace_id, insight_asset_id) references public.content_assets(workspace_id, id) on delete set null (insight_asset_id)
);
create index content_snapshots_content on public.content_snapshots (content_id, measured_on desc);

-- AI reports. input_hash identifies the exact inputs, so the same analysis isn't paid for twice.
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_id uuid not null,
  mode text not null check (mode in ('creative','performance','business')),
  snapshot_id uuid,
  input_hash text not null check (char_length(input_hash) = 64),
  report jsonb not null,
  model text not null default '',
  saved_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (content_id, mode, input_hash),
  foreign key (workspace_id, content_id) references public.content_items(workspace_id, id) on delete cascade,
  foreign key (workspace_id, snapshot_id) references public.content_snapshots(workspace_id, id) on delete set null (snapshot_id)
);
create index content_reports_content on public.content_reports (content_id, created_at desc);

create table public.content_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  report_id uuid not null,
  role text not null check (role in ('user','assistant')),
  text text not null check (char_length(text) between 1 and 8000),
  created_at timestamptz not null default now(),
  foreign key (workspace_id, report_id) references public.content_reports(workspace_id, id) on delete cascade
);
create index content_messages_report on public.content_messages (report_id, created_at);

-- Ideas the creator saved from a report ("what to create next", hooks, tests).
create table public.content_ideas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_id uuid,
  report_id uuid,
  text text not null check (char_length(text) between 1 and 1000),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, content_id) references public.content_items(workspace_id, id) on delete cascade,
  foreign key (workspace_id, report_id) references public.content_reports(workspace_id, id) on delete set null (report_id)
);

-- What the creator says this content is associated with. A link is a record, not a claim that the post caused it.
create table public.content_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_id uuid not null,
  deal_id uuid,
  income_id uuid,
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  check (num_nonnulls(deal_id, income_id) = 1),
  unique (content_id, deal_id), unique (content_id, income_id),
  foreign key (workspace_id, content_id) references public.content_items(workspace_id, id) on delete cascade,
  foreign key (workspace_id, deal_id) references public.deals(workspace_id, id) on delete cascade,
  foreign key (workspace_id, income_id) references public.income_entries(workspace_id, id) on delete cascade
);

do $$ declare t text; begin
  foreach t in array array['content_items','content_assets','content_snapshots','content_reports','content_messages','content_ideas','content_links'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id))', t || '_member', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- Private bucket for creator media. 50 MB per file; only these types.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('content', 'content', false, 52428800, array['video/mp4','video/quicktime','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy storage_content_select on storage.objects for select to authenticated
  using (bucket_id = 'content' and public.is_workspace_member(public.path_workspace(name)));
create policy storage_content_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'content' and public.is_workspace_member(public.path_workspace(name)));
create policy storage_content_delete on storage.objects for delete to authenticated
  using (bucket_id = 'content' and public.is_workspace_member(public.path_workspace(name)));

-- AI usage: content analysis counts against the same hourly cap; token counts let us track cost.
alter table public.ai_usage drop constraint ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check check (kind in ('advisor','draft','contract','content'));
alter table public.ai_usage add column if not exists input_tokens int check (input_tokens >= 0), add column if not exists output_tokens int check (output_tokens >= 0);
