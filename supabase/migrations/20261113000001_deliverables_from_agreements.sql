-- Deliverables from agreements reach the partnership (and so the content calendar).
-- agreement_id marks deliverables added from a generated agreement, so voiding that agreement can remove the ones not started.
-- The composite key keeps it inside the same workspace.
alter table public.deliverables add column if not exists agreement_id uuid;
alter table public.deliverables drop constraint if exists deliverables_agreement_fk;
alter table public.deliverables add constraint deliverables_agreement_fk
  foreign key (workspace_id, agreement_id) references public.agreements(workspace_id, id) on delete set null (agreement_id);
create index if not exists deliverables_agreement on public.deliverables (workspace_id, agreement_id) where agreement_id is not null;

-- One-time backfill: sent or signed agreements already linked to a partnership add their dated deliverables (no duplicates).
insert into public.deliverables (workspace_id, deal_id, name, due_on, agreement_id)
select distinct on (a.workspace_id, a.deal_id, lower(btrim(d->>'name')), (d->>'dueOn')::date)
       a.workspace_id, a.deal_id, left(btrim(d->>'name'), 200), (d->>'dueOn')::date, a.id
from public.agreements a
cross join lateral jsonb_array_elements(case when jsonb_typeof(a.terms->'deliverables') = 'array' then a.terms->'deliverables' else '[]'::jsonb end) d
where a.status in ('sent', 'signed') and a.deal_id is not null
  and coalesce(btrim(d->>'name'), '') <> '' and coalesce(d->>'dueOn', '') ~ '^\d{4}-\d{2}-\d{2}$'
  and not exists (select 1 from public.deliverables x where x.workspace_id = a.workspace_id and x.deal_id = a.deal_id
                  and lower(x.name) = lower(btrim(d->>'name')) and x.due_on = (d->>'dueOn')::date);
