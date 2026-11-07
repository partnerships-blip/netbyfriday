# Content Intelligence

Creators add their published content, upload the original video or image and screenshots of their insights, record
performance over time, and get AI reviews grounded only in what they provided. Behind the `contentIntel` flag.

## Status

| Milestone | State |
|---|---|
| 1. Content Library and database | Built: library (grid/table, search, platform filter, sort), item page, all tables with RLS |
| 2. Secure upload, link and manual entry | Built: private bucket, signed one-time uploads, server-side size/type/signature checks, frames sampled in the browser, link detection, metrics history |
| 3. Insight screenshot extraction and confirmation | Built: AI transcribes labels and value text; numbers parsed by our code; unclear values left empty and flagged; period must be confirmed; reading cached per screenshot |
| 4. Creative Review and Performance Check-In | Planned |
| 5. Follow-up conversation | Planned |
| 6. Business Impact links | Tables ready (`content_links`); UI planned |
| 7. Comparisons, Advisor access, optimisation | Planned |

## Turning it on

The flag is off by default. To show it on a deployment, add `contentIntel` to `NEXT_PUBLIC_NBF_FLAGS` in Vercel
(e.g. `contracts,taxes,invoiceLinks,contentIntel`) and redeploy. The e2e suite runs with it on.

## What we never do

- No scraping. A pasted Instagram, TikTok or YouTube link is only recognised (platform and format) and stored. Nothing is
  downloaded from the platform, and a link alone never triggers a video analysis.
- No social account connection is needed or used.
- Uploaded media stays in the private `content` bucket under `{workspace_id}/{content_id}/…`, readable only by members of
  that workspace (storage RLS) and shown through signed URLs that expire after an hour.
- Uploaded content is never published, sent anywhere, or used to train models.

## Upload pipeline

1. The browser checks type and size, and reads a video's duration locally.
2. `prepareUpload` (server) re-checks type, size, the per-item screenshot cap and the workspace storage quota, then issues a
   one-time signed upload URL for a path inside the creator's workspace.
3. The file goes straight from the browser to Supabase Storage (it never passes through a Vercel function, which has a
   4.5 MB body limit).
4. `confirmUpload` (server) looks the object up in storage, checks the stored size and type, reads the first 32 bytes and
   checks the file signature (MP4/MOV `ftyp`, JPEG, PNG, WEBP). Anything that fails is deleted.
5. For videos, the browser samples up to 8 still frames (0.5 s, 1.5 s, 3 s, then evenly spaced) as small JPEGs and uploads
   them the same way. These frames are what a creative review will look at. No server-side video processing.

A new original replaces the previous one and its frames. Deleting an item deletes its files, snapshots, reports,
conversations and links.

## Reading insights screenshots

1. The creator uploads a screenshot (same verified upload path as above). It is read straight away.
2. The model is asked only to transcribe: each metric's label, the value exactly as shown ("2,599", "1.2K", "4.2 sec",
   "41.8%"), whether it was clearly legible, and the period and date text shown.
3. Our code turns that text into numbers (`lib/content/extract.ts`). A value that was illegible or doesn't parse cleanly
   is left empty and flagged "Check this"; it can only be saved if the creator types it.
4. The period ("Last 24 hours", "Lifetime", …) is mapped to one of ours; if it can't be, the creator must choose before
   saving. The date shown on the screenshot becomes "Checked on" (never a future date).
5. Confirming saves a new snapshot marked "From your screenshot", linked to the screenshot. The reading itself is cached
   on the screenshot, so opening the review again doesn't call the AI again.

## Limits (beta)

| Setting (Vercel env, optional) | Default |
|---|---|
| `CONTENT_MAX_VIDEO_MB` | 50 (also the bucket's hard limit) |
| `CONTENT_MAX_IMAGE_MB` | 10 |
| `CONTENT_MAX_VIDEO_SECONDS` | 180 |
| `CONTENT_STORAGE_MB` (per workspace) | 1024 |
| Frames per video | 8 |
| Insight screenshots per item | 6 |

Raising the video size above 50 MB needs the bucket's `file_size_limit` raised too, and Supabase's global upload limit
(50 MB on the Free plan).

## Data model

`content_items`, `content_assets`, `content_snapshots` (one row per measurement, with its date and period; never updated
in place), `content_reports` (unique on content + mode + input hash, so identical analyses aren't paid for twice),
`content_messages`, `content_ideas`, `content_links` (to a partnership or an income entry; a link is a record, not a claim
of cause). Every table: RLS member policy, composite foreign keys so rows can't point across workspaces. Isolation tests
in `supabase/tests/database/rls_isolation.test.sql`.

`ai_usage` gains kind `content` and token columns for cost tracking.

## Costs

- Storage: Supabase Storage is included up to the plan's quota (1 GB on Free, 100 GB on Pro), then billed per GB. The
  per-workspace cap above keeps beta usage predictable.
- Bandwidth: videos are served by signed URL; each view of the item page streams the video only if played.
- AI, screenshot reading: one vision call per screenshot (about 1,500–2,000 input and ~300 output tokens; roughly 1–2¢ on
  a Sonnet-class model). Cached, counted in the hourly cap, tokens stored in `ai_usage`.
- AI, later analyses: send frames (images) and text to the existing Anthropic provider;
  each analysis is counted against the per-user hourly cap and its token use recorded.
- Would materially increase costs (not built): automatic speech-to-text for voiceovers (needs a second AI vendor),
  server-side video processing, analysing every frame, or unlimited analyses.

## Rollback

The migration is additive. To remove it:

```sql
drop table if exists public.content_links, public.content_ideas, public.content_messages, public.content_reports,
  public.content_snapshots, public.content_assets, public.content_items cascade;
drop policy if exists storage_content_select on storage.objects;
drop policy if exists storage_content_insert on storage.objects;
drop policy if exists storage_content_delete on storage.objects;
-- Empty the bucket first in the Supabase dashboard (Storage > content), then:
delete from storage.buckets where id = 'content';
alter table public.content_assets drop column if exists extraction, drop column if exists extracted_at; -- if the tables are kept
alter table public.ai_usage drop constraint ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check check (kind in ('advisor','draft','contract'));
```

The `income_entries_ws_id` and `deliverables_ws_id` unique indexes are harmless to keep.

## Local testing

The local stack has no Storage service, so `/home/claude/supa-lite/storage-emu.js` (outside the repo) emulates the
endpoints supabase-js uses, enforcing the bucket's size/type limits and the workspace path rule. Fixtures:
`tests/e2e/fixtures/sample-reel.mp4` (8 s, H.264) and `sample-insights.png`.
