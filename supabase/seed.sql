-- Local development and STAGING only (`supabase db reset`, and the Staging database workflow). Never run against production.
insert into public.invite_codes (code, max_uses, note) values
  ('LOCAL-DEV-01', 100, 'Local development'),
  ('E2E-TEST-01', 500, 'Playwright end-to-end tests'),
  ('NBF-STAGING-POCA', 25, 'Founder and staging testers')
on conflict do nothing;
