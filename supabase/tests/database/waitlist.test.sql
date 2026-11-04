-- Run with: supabase test db. Waitlist: public join only through join_waitlist(); no direct reads; admin-only listing and invites.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

set local role anon;
select is(public.join_waitlist('Ana@Example.com', 'Ana', '@ana', 'Lifestyle', 'site', true), 'joined', 'a visitor can join');
select is(public.join_waitlist('ana@example.COM', '', '', '', '', true), 'already', 'duplicate emails are recognized, case-insensitively');
select throws_ok($$ select public.join_waitlist('b@example.com', '', '', '', '', false) $$, '22023', 'CONSENT_REQUIRED', 'consent is required');
select throws_ok($$ select public.join_waitlist('not-an-email', '', '', '', '', true) $$, '22023', 'EMAIL_INVALID', 'invalid email rejected');
select throws_ok($$ select count(*) from public.waitlist $$, '42501', null, 'visitors cannot read the waitlist');
select throws_ok($$ insert into public.waitlist (email, consent_at) values ('c@example.com', now()) $$, '42501', null, 'visitors cannot insert directly');
reset role;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.dev', '{"invite_code":"E2E-TEST-01"}');
insert into public.admins (user_id) values ('44444444-4444-4444-4444-444444444444');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000009","role":"authenticated"}', true);
select throws_ok($$ select * from public.admin_waitlist() $$, '42501', 'NOT_ADMIN', 'non-admins cannot list the waitlist');

select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
create temp table t_code as select public.admin_invite_waitlist((select id from public.admin_waitlist() limit 1)) as code;
select ok((select code from t_code) ~ '^NBF-[0-9A-F]{8}$', 'admin invite creates a single-use code');
select is(public.admin_invite_waitlist((select id from public.admin_waitlist() limit 1)), (select code from t_code), 'inviting twice returns the same code');

select * from finish();
rollback;
