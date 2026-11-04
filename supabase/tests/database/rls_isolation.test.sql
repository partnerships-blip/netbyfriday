-- Run with: supabase test db
-- Verifies invite gating, workspace isolation, cross-tenant FK protection, and payment guards.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into public.invite_codes(code, max_uses) values ('PGTAP-TEST', 5);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.dev', '{"invite_code":"PGTAP-TEST"}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.dev', '{"invite_code":"pgtap-test"}');

select throws_ok(
  $$ insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
     ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@test.dev', '{"invite_code":"WRONG-CODE"}') $$,
  'P0001', 'INVITE_INVALID', 'sign-up with an invalid invite code is rejected');

select is((select uses from public.invite_codes where code = 'PGTAP-TEST'), 2, 'invite uses counted');
select is((select count(*)::int from public.workspaces), 2, 'each user gets one workspace');

create temp table t_ws as select owner_id, id from public.workspaces;
grant select on t_ws to authenticated;

-- ---------- as user A ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is((select count(*)::int from public.workspaces), 1, 'A sees only their workspace');

insert into public.brands (id, workspace_id, name)
  values ('aaaaaaaa-0000-0000-0000-000000000001', (select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'Brand A');
insert into public.deals (id, workspace_id, brand_id, campaign, fee_cents, stage)
  values ('aaaaaaaa-0000-0000-0000-000000000002', (select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'aaaaaaaa-0000-0000-0000-000000000001', 'Launch', 500000, 'contracted');
insert into public.invoices (id, workspace_id, number, deal_id, client_name, amount_cents, issued_on, due_on)
  values ('aaaaaaaa-0000-0000-0000-000000000003', (select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'INV-1', 'aaaaaaaa-0000-0000-0000-000000000002', 'Brand A', 500000, '2026-10-01', '2026-10-31');
select lives_ok(
  $$ insert into public.payments (workspace_id, invoice_id, amount_cents, received_on)
     values ((select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'aaaaaaaa-0000-0000-0000-000000000003', 200000, '2026-10-10') $$,
  'A records a partial payment');
select throws_ok(
  $$ insert into public.payments (workspace_id, invoice_id, amount_cents, received_on)
     values ((select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'aaaaaaaa-0000-0000-0000-000000000003', 300001, '2026-10-11') $$,
  '23514', 'PAYMENT_EXCEEDS_BALANCE', 'overpayment is rejected');
select throws_ok(
  $$ update public.invoices set voided_at = now() where id = 'aaaaaaaa-0000-0000-0000-000000000003' $$,
  '23514', 'VOID_WITH_PAYMENTS', 'invoice with payments cannot be voided');
select throws_ok(
  $$ update public.invoices set amount_cents = 100000 where id = 'aaaaaaaa-0000-0000-0000-000000000003' $$,
  '23514', 'AMOUNT_BELOW_PAID', 'invoice amount cannot drop below paid');
select throws_ok(
  $$ insert into public.payments (workspace_id, invoice_id, amount_cents, received_on)
     values ((select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'aaaaaaaa-0000-0000-0000-000000000003', 0, '2026-10-11') $$,
  '23514', null, 'zero payment rejected');

-- ---------- as user B ----------
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select is((select count(*)::int from public.brands), 0, 'B cannot see A brands');
select is((select count(*)::int from public.deals), 0, 'B cannot see A deals');
select is((select count(*)::int from public.invoices), 0, 'B cannot see A invoices');
select is((select count(*)::int from public.payments), 0, 'B cannot see A payments');
select is((select count(*)::int from public.invite_codes), 0, 'B cannot read invite codes');

select throws_ok(
  $$ insert into public.deals (workspace_id, brand_id, campaign)
     values ((select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'aaaaaaaa-0000-0000-0000-000000000001', 'Hijack') $$,
  '42501', null, 'B cannot insert into A workspace');

select is(
  (with u as (update public.deals set notes = 'tampered' where id = 'aaaaaaaa-0000-0000-0000-000000000002' returning 1) select count(*)::int from u),
  0, 'B cannot update A deal');

insert into public.brands (id, workspace_id, name)
  values ('bbbbbbbb-0000-0000-0000-000000000001', (select id from t_ws where owner_id = '22222222-2222-2222-2222-222222222222'), 'Brand B');
select throws_ok(
  $$ insert into public.payments (workspace_id, invoice_id, amount_cents, received_on)
     values ((select id from t_ws where owner_id = '22222222-2222-2222-2222-222222222222'), 'aaaaaaaa-0000-0000-0000-000000000003', 100, '2026-10-12') $$,
  '23503', null, 'B cannot attach a payment to A invoice from their own workspace');

select throws_ok($$ select public.admin_overview() $$, '42501', 'NOT_ADMIN', 'non-admin cannot read admin overview');

select * from finish();
rollback;
