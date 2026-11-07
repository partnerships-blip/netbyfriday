-- Caches what was read from an insights screenshot, so reviewing it again never costs a second AI call.
-- These are proposals only; confirmed numbers live in content_snapshots (source = 'screenshot').
alter table public.content_assets add column extraction jsonb, add column extracted_at timestamptz;
