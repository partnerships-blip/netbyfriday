-- Generated agreements and simple e-signing (flag: agreements).
-- A creator turns a brand email, note or DM into a draft agreement from a fixed template, edits the terms, signs, and sends
-- a private link from their own email app. The brand opens the link, agrees to sign electronically, and signs.
-- Once sent, the agreement text is frozen (body + SHA-256). Signing is only possible through sign_agreement(), which checks
-- that the text the brand saw is the text on file, and records an audit trail. netbyfriday sends no email.

create table public.agreements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deal_id uuid,
  status text not null default 'draft' check (status in ('draft', 'sent', 'signed', 'void')),
  title text not null default '' check (char_length(title) <= 200),
  source_text text not null default '' check (char_length(source_text) <= 20000),  -- the pasted message (screenshots are not kept)
  extracted jsonb not null default '{}'::jsonb,                                        -- what the AI proposed, with the wording it came from
  terms jsonb not null default '{}'::jsonb,                                            -- the creator's edited terms (validated by the app)
  body text not null default '' check (char_length(body) <= 60000),                   -- the agreement text, frozen when sent
  body_sha256 text check (body_sha256 is null or body_sha256 ~ '^[0-9a-f]{64}$'),
  share_token uuid unique,
  creator_name text not null default '' check (char_length(creator_name) <= 120),
  creator_email text not null default '' check (char_length(creator_email) <= 200),
  creator_signature text not null default '' check (char_length(creator_signature) <= 120),
  creator_signed_at timestamptz,
  creator_ip text not null default '' check (char_length(creator_ip) <= 64),
  sent_at timestamptz,
  first_viewed_at timestamptz,
  signer_name text not null default '' check (char_length(signer_name) <= 120),
  signer_title text not null default '' check (char_length(signer_title) <= 120),
  signer_email text not null default '' check (char_length(signer_email) <= 200),
  signer_signature text not null default '' check (char_length(signer_signature) <= 120),
  signer_ip text not null default '' check (char_length(signer_ip) <= 64),
  signer_user_agent text not null default '' check (char_length(signer_user_agent) <= 400),
  signed_at timestamptz,
  voided_at timestamptz,
  audit jsonb not null default '[]'::jsonb check (jsonb_typeof(audit) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  check (status <> 'sent' or (share_token is not null and body_sha256 is not null and creator_signed_at is not null)),
  check (status <> 'signed' or (signed_at is not null and body_sha256 is not null)),
  foreign key (workspace_id, deal_id) references public.deals(workspace_id, id) on delete set null (deal_id)
);
create index agreements_workspace on public.agreements(workspace_id, status);
create trigger agreements_touch before update on public.agreements for each row execute function public.touch_updated_at();

alter table public.agreements enable row level security;
create policy agreements_member on public.agreements for all to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
revoke all on public.agreements from anon;

-- The app may edit drafts, send, void and link to a partnership. Signer fields are written only by sign_agreement().
revoke update on public.agreements from authenticated;
grant update (deal_id, status, title, terms, body, body_sha256, share_token, creator_name, creator_email, creator_signature,
  creator_signed_at, creator_ip, sent_at, voided_at, audit) on public.agreements to authenticated;

-- Guards that hold no matter how a row is written by a signed-in user:
--  * new rows start as drafts with no signature;
--  * a sent or signed agreement's text and terms never change (it can only be voided, or linked to a partnership);
--  * only sign_agreement() (a security-definer function) can mark an agreement signed.
create or replace function public.agreements_guard() returns trigger language plpgsql as $$
declare app_user boolean := current_user in ('authenticated', 'anon');
begin
  if tg_op = 'INSERT' then
    if app_user and (new.status <> 'draft' or new.signed_at is not null or new.share_token is not null or new.signer_name <> '') then
      raise exception 'AGREEMENT_NEW_MUST_BE_DRAFT' using errcode = '23514';
    end if;
    return new;
  end if;
  if old.status in ('sent', 'signed', 'void') and (new.body is distinct from old.body or new.body_sha256 is distinct from old.body_sha256
      or new.terms is distinct from old.terms or new.title is distinct from old.title or new.creator_signature is distinct from old.creator_signature
      or new.creator_name is distinct from old.creator_name) then
    raise exception 'AGREEMENT_LOCKED' using errcode = '23514';
  end if;
  if app_user then
    if new.status = 'signed' and old.status <> 'signed' then raise exception 'AGREEMENT_SIGN_VIA_LINK' using errcode = '23514'; end if;
    if old.status = 'signed' and new.status <> 'signed' then raise exception 'AGREEMENT_SIGNED_FINAL' using errcode = '23514'; end if;
    if old.status = 'void' and new.status <> 'void' then raise exception 'AGREEMENT_LOCKED' using errcode = '23514'; end if;
    if old.status = 'sent' and new.status = 'draft' then raise exception 'AGREEMENT_LOCKED' using errcode = '23514'; end if;
  end if;
  return new;
end $$;
create trigger agreements_guard before insert or update on public.agreements for each row execute function public.agreements_guard();

-- What a brand sees from the link: one agreement, by token, never a void one.
create or replace function public.shared_agreement(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'title', a.title, 'status', a.status, 'body', a.body, 'body_sha256', a.body_sha256,
    'creator_name', a.creator_name, 'creator_email', a.creator_email, 'creator_signature', a.creator_signature, 'creator_signed_at', a.creator_signed_at,
    'sent_at', a.sent_at, 'signer_name', a.signer_name, 'signer_title', a.signer_title, 'signer_email', a.signer_email,
    'signer_signature', a.signer_signature, 'signed_at', a.signed_at, 'audit', a.audit
  )
  from public.agreements a
  where p_token is not null and a.share_token = p_token and a.status in ('sent', 'signed')
  limit 1;
$$;
revoke all on function public.shared_agreement(uuid) from public;
grant execute on function public.shared_agreement(uuid) to anon, authenticated;

-- First time the link is opened: noted once in the audit trail.
create or replace function public.agreement_opened(p_token uuid, p_ip text, p_ua text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.agreements
     set first_viewed_at = now(),
         audit = audit || jsonb_build_array(jsonb_build_object('event', 'opened', 'at', now(), 'ip', left(coalesce(p_ip, ''), 64), 'user_agent', left(coalesce(p_ua, ''), 400)))
   where p_token is not null and share_token = p_token and status = 'sent' and first_viewed_at is null;
end $$;
revoke all on function public.agreement_opened(uuid, text, text) from public;
grant execute on function public.agreement_opened(uuid, text, text) to anon, authenticated;

-- Signing. The signer must agree to sign electronically, give their name and email, type their signature, and the
-- fingerprint of the text they were shown must match the text on file.
create or replace function public.sign_agreement(p_token uuid, p_hash text, p_name text, p_title text, p_email text,
  p_signature text, p_consent boolean, p_ip text, p_ua text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.agreements%rowtype;
begin
  select * into a from public.agreements where p_token is not null and share_token = p_token for update;
  if not found or a.status <> 'sent' then raise exception 'AGREEMENT_NOT_OPEN' using errcode = '23514'; end if;
  if p_hash is null or p_hash <> a.body_sha256 then raise exception 'AGREEMENT_CHANGED' using errcode = '23514'; end if;
  if coalesce(p_consent, false) is not true then raise exception 'CONSENT_REQUIRED' using errcode = '23514'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 or char_length(p_name) > 120 then raise exception 'SIGNER_NAME_REQUIRED' using errcode = '23514'; end if;
  if char_length(trim(coalesce(p_signature, ''))) < 2 or char_length(p_signature) > 120 then raise exception 'SIGNATURE_REQUIRED' using errcode = '23514'; end if;
  if coalesce(p_email, '') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(p_email) > 200 then raise exception 'SIGNER_EMAIL_REQUIRED' using errcode = '23514'; end if;
  update public.agreements set
    status = 'signed', signed_at = now(),
    signer_name = trim(p_name), signer_title = left(trim(coalesce(p_title, '')), 120), signer_email = lower(trim(p_email)),
    signer_signature = trim(p_signature), signer_ip = left(coalesce(p_ip, ''), 64), signer_user_agent = left(coalesce(p_ua, ''), 400),
    audit = audit || jsonb_build_array(
      jsonb_build_object('event', 'consented', 'at', now(), 'by', trim(p_name)),
      jsonb_build_object('event', 'signed', 'at', now(), 'by', trim(p_name), 'email', lower(trim(p_email)), 'ip', left(coalesce(p_ip, ''), 64),
        'user_agent', left(coalesce(p_ua, ''), 400), 'sha256', a.body_sha256))
  where id = a.id;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.sign_agreement(uuid, text, text, text, text, text, boolean, text, text) from public;
grant execute on function public.sign_agreement(uuid, text, text, text, text, text, boolean, text, text) to anon, authenticated;
