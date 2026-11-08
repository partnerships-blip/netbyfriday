-- Run with: supabase test db
-- Verifies invite gating, workspace isolation, cross-tenant FK protection, and payment guards.
begin;
create extension if not exists pgtap with schema extensions;
select plan(51);

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
insert into public.contacts (id, workspace_id, brand_id, name, email)
  values ('aaaaaaaa-0000-0000-0000-000000000004', (select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'aaaaaaaa-0000-0000-0000-000000000001', 'Dana A', 'dana@a.test');
select lives_ok(
  $$ insert into public.tasks (workspace_id, title, deal_id, contact_id, invoice_id)
     values ((select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'Send invoice reminder',
             'aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000003') $$,
  'A links a task to their own partnership, contact and invoice');
select lives_ok(
  $$ insert into public.contracts (id, workspace_id, deal_id, title, usage_rights, usage_starts_on, usage_ends_on)
     values ('aaaaaaaa-0000-0000-0000-000000000005', (select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'),
             'aaaaaaaa-0000-0000-0000-000000000002', 'Launch agreement', 'Paid social, 60 days', '2026-10-01', '2026-11-30') $$,
  'A adds a contract to their own partnership');
update public.invoices set share_token = 'cccccccc-0000-0000-0000-000000000001' where id = 'aaaaaaaa-0000-0000-0000-000000000003';
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

insert into public.import_runs (workspace_id, kind, file_name, total_rows, imported)
  values ((select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'deals', 'deals.csv', 3, 3);

insert into public.content_items (id, workspace_id, title) values ('c0000000-0000-4000-8000-00000000000a', (select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'A reel');
insert into public.content_snapshots (workspace_id, content_id, measured_on, period, views) values ((select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'c0000000-0000-4000-8000-00000000000a', '2026-11-01', '24h', 2599);
insert into public.content_reports (workspace_id, content_id, mode, input_hash, report) values ((select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'c0000000-0000-4000-8000-00000000000a', 'creative', repeat('a', 64), '{}');

-- Agreements: drafts only on insert, text frozen once sent, signing only through the link.
select lives_ok(
  $$ insert into public.agreements (id, workspace_id, deal_id, title, terms)
     values ('aaaaaaaa-0000-0000-0000-000000000006', (select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'),
             'aaaaaaaa-0000-0000-0000-000000000002', 'Launch agreement', '{"fee":"5000"}') $$,
  'A drafts an agreement on their own partnership');
select throws_ok(
  $$ insert into public.agreements (workspace_id, title, status, signed_at)
     values ((select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'Pre-signed', 'signed', now()) $$,
  '23514', 'AGREEMENT_NEW_MUST_BE_DRAFT', 'an agreement cannot be created already signed');
select lives_ok(
  $$ update public.agreements set status = 'sent', body = 'Launch agreement body', body_sha256 = '15ef33a8b6567cab1da5eb250445e5ebf3f61b1263e0c1fa037af4db348969f5',
       share_token = 'dddddddd-0000-0000-0000-000000000001', creator_signature = 'Avery A', creator_signed_at = now(), sent_at = now()
     where id = 'aaaaaaaa-0000-0000-0000-000000000006' $$,
  'A signs and sends their agreement');
select throws_ok(
  $$ update public.agreements set body = 'Something else' where id = 'aaaaaaaa-0000-0000-0000-000000000006' $$,
  '23514', 'AGREEMENT_LOCKED', 'sent agreement text cannot be changed');
select throws_ok(
  $$ update public.agreements set status = 'signed' where id = 'aaaaaaaa-0000-0000-0000-000000000006' $$,
  '23514', 'AGREEMENT_SIGN_VIA_LINK', 'the creator cannot mark it signed for the brand');
select throws_ok(
  $$ update public.agreements set signer_name = 'Fake Brand' where id = 'aaaaaaaa-0000-0000-0000-000000000006' $$,
  '42501', null, 'signer fields are not writable from the app');

-- ---------- as user B ----------
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select is((select count(*)::int from public.brands), 0, 'B cannot see A brands');
select is((select count(*)::int from public.deals), 0, 'B cannot see A deals');
select is((select count(*)::int from public.invoices), 0, 'B cannot see A invoices');
select is((select count(*)::int from public.payments), 0, 'B cannot see A payments');
select is((select count(*)::int from public.invite_codes), 0, 'B cannot read invite codes');
select is((select count(*)::int from public.contacts), 0, 'B cannot see A contacts');
select is((select count(*)::int from public.tasks), 0, 'B cannot see A tasks');
select throws_ok(
  $$ insert into public.contacts (workspace_id, name) values ((select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'Hijack') $$,
  '42501', null, 'B cannot insert a contact into A workspace');

select throws_ok(
  $$ insert into public.deals (workspace_id, brand_id, campaign)
     values ((select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'aaaaaaaa-0000-0000-0000-000000000001', 'Hijack') $$,
  '42501', null, 'B cannot insert into A workspace');

select is_empty(
  $$ update public.deals set notes = 'tampered' where id = 'aaaaaaaa-0000-0000-0000-000000000002' returning id $$,
  'B cannot update A deal');

insert into public.brands (id, workspace_id, name)
  values ('bbbbbbbb-0000-0000-0000-000000000001', (select id from t_ws where owner_id = '22222222-2222-2222-2222-222222222222'), 'Brand B');
select throws_ok(
  $$ insert into public.payments (workspace_id, invoice_id, amount_cents, received_on)
     values ((select id from t_ws where owner_id = '22222222-2222-2222-2222-222222222222'), 'aaaaaaaa-0000-0000-0000-000000000003', 100, '2026-10-12') $$,
  '23503', null, 'B cannot attach a payment to A invoice from their own workspace');

select throws_ok(
  $$ insert into public.tasks (workspace_id, title, deal_id)
     values ((select id from t_ws where owner_id = '22222222-2222-2222-2222-222222222222'), 'Steal', 'aaaaaaaa-0000-0000-0000-000000000002') $$,
  '23503', null, 'B cannot link a task in their workspace to A partnership');

select throws_ok($$ select public.admin_overview() $$, '42501', 'NOT_ADMIN', 'non-admin cannot read admin overview');

select is((select count(*)::int from public.contracts), 0, 'B cannot see A contracts');
select throws_ok(
  $$ insert into public.contracts (workspace_id, title) values ((select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'Hijack') $$,
  '42501', null, 'B cannot add a contract to A workspace');
select is((select count(*)::int from public.import_runs), 0, 'B cannot see A import history');
select throws_ok(
  $$ insert into public.import_runs (workspace_id, kind) values ((select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'contacts') $$,
  '42501', null, 'B cannot write import history into A workspace');
select is((select count(*)::int from public.content_items), 0, 'B cannot see A content');
select is((select count(*)::int from public.content_snapshots), 0, 'B cannot see A performance snapshots');
select is((select count(*)::int from public.content_reports), 0, 'B cannot see A content reports');
select throws_ok(
  $$ insert into public.content_items (workspace_id, title) values ((select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'sneaky') $$,
  '42501', null, 'B cannot add content to A workspace');
select throws_ok(
  $$ insert into public.content_snapshots (workspace_id, content_id, measured_on, period) values ((select id from t_ws where owner_id = '22222222-2222-2222-2222-222222222222'), 'c0000000-0000-4000-8000-00000000000a', '2026-11-02', '24h') $$,
  '23503', null, 'B cannot attach a snapshot in its own workspace to A content');
select is((select count(*)::int from public.agreements), 0, 'B cannot see A agreements');
select throws_ok(
  $$ insert into public.agreements (workspace_id, title) values ((select id from t_ws where owner_id = '11111111-1111-1111-1111-111111111111'), 'Hijack') $$,
  '42501', null, 'B cannot add an agreement to A workspace');
select is(public.shared_invoice(null), null, 'no token, no invoice');

-- ---------- anonymous (a brand opening a shared invoice link) ----------
set local role anon;
select is(public.shared_invoice('cccccccc-0000-0000-0000-000000000001')->>'number', 'INV-1', 'anyone with the link sees that one invoice');
select is(public.shared_invoice('cccccccc-0000-0000-0000-000000000002'), null, 'a wrong token reveals nothing');

-- ---------- anonymous (a brand signing from the creator's link) ----------
select is(public.shared_agreement('dddddddd-0000-0000-0000-000000000001')->>'title', 'Launch agreement', 'the brand sees the agreement from the link');
select is(public.shared_agreement('dddddddd-0000-0000-0000-000000000002'), null, 'a wrong agreement token reveals nothing');
select throws_ok(
  $$ select public.sign_agreement('dddddddd-0000-0000-0000-000000000001', repeat('0', 64), 'Dana Brand', 'Partnerships', 'dana@brand.test', 'Dana Brand', true, '1.2.3.4', 'test') $$,
  '23514', 'AGREEMENT_CHANGED', 'signing fails if the text shown is not the text on file');
select throws_ok(
  $$ select public.sign_agreement('dddddddd-0000-0000-0000-000000000001', '15ef33a8b6567cab1da5eb250445e5ebf3f61b1263e0c1fa037af4db348969f5', 'Dana Brand', '', 'dana@brand.test', 'Dana Brand', false, '1.2.3.4', 'test') $$,
  '23514', 'CONSENT_REQUIRED', 'signing needs consent to sign electronically');
select lives_ok(
  $$ select public.sign_agreement('dddddddd-0000-0000-0000-000000000001', '15ef33a8b6567cab1da5eb250445e5ebf3f61b1263e0c1fa037af4db348969f5', 'Dana Brand', 'Partnerships', 'dana@brand.test', 'Dana Brand', true, '1.2.3.4', 'test') $$,
  'the brand signs from the link');
select is(public.shared_agreement('dddddddd-0000-0000-0000-000000000001')->>'status', 'signed', 'the agreement is signed');
select throws_ok(
  $$ select public.sign_agreement('dddddddd-0000-0000-0000-000000000001', '15ef33a8b6567cab1da5eb250445e5ebf3f61b1263e0c1fa037af4db348969f5', 'Dana Brand', '', 'dana@brand.test', 'Dana Brand', true, '1.2.3.4', 'test') $$,
  '23514', 'AGREEMENT_NOT_OPEN', 'a signed agreement cannot be signed again');

select * from finish();
rollback;
