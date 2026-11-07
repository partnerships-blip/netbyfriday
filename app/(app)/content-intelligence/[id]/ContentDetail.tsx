'use client';
// One content item: preview and original upload, details, performance history (each measurement kept with its date and
// period), and insight screenshots. Analyses and business links build on this page in later milestones.
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Btn, Card, Eyebrow, Pill } from '@/components/ui';
import { FormModal } from '@/components/FormModal';
import { toast } from '@/components/Toaster';
import { createClient } from '@/lib/supabase/client';
import { shortDate } from '@/lib/finance/core.js';
import { PLATFORM_LABEL, FORMAT_LABEL, PERIOD_LABEL, METRICS, checkUpload, LIMITS } from '@/lib/content/model';
import { contentFields, deriveFromLink, snapshotFields, emptySnapshot } from '@/lib/content/fields';
import { sampleFrames, videoDuration } from '@/lib/content/frames';
import type { Asset, ContentItem, Snapshot } from '@/lib/content/server';
import { updateContent, deleteContent, addSnapshot, deleteSnapshot, prepareUpload, confirmUpload, deleteAsset } from '../actions';

type Lim = { videoMb: number; imageMb: number; videoSeconds: number; frames: number; insights: number };
const fmtMetric = (k: string, v: number | null) => v == null ? '—' : k === 'skipRate' || k === 'retentionPct' ? `${v}%` : k === 'avgWatchSeconds' ? `${v}s` : v.toLocaleString('en-US');

export function ContentDetail({ item, assets, snapshots, today, readOnly, limits }: { item: ContentItem; assets: Asset[]; snapshots: Snapshot[]; today: string; readOnly: boolean; limits: Lim }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState('');
  const mediaInput = useRef<HTMLInputElement>(null), shotInput = useRef<HTMLInputElement>(null);
  const media = assets.find(a => a.kind === 'media');
  const frames = assets.filter(a => a.kind === 'frame');
  const shots = assets.filter(a => a.kind === 'insight');
  const lim = { ...LIMITS, videoBytes: limits.videoMb * 1048576, imageBytes: limits.imageMb * 1048576 };

  /** prepare (server checks) → upload straight to private storage → confirm (server verifies what arrived). */
  async function put(kind: 'media' | 'frame' | 'insight', blob: Blob, mime: string, extra: { frameAt?: number; durationSeconds?: number } = {}) {
    const p = await prepareUpload({ contentId: item.id, kind, mime, bytes: blob.size, durationSeconds: extra.durationSeconds });
    if (!p.ok) throw new Error(p.error);
    const { error } = await createClient().storage.from('content').uploadToSignedUrl(p.path!, p.token!, blob, { contentType: mime });
    if (error) throw new Error(/size|large/i.test(error.message) ? 'That file is too large.' : 'The upload didn’t finish. Check your connection and try again.');
    const c = await confirmUpload({ contentId: item.id, path: p.path, kind, ...extra });
    if (!c.ok) throw new Error(c.error);
  }

  async function uploadMedia(f: File | undefined) {
    if (!f || readOnly) return;
    const bad = checkUpload('media', f.type, f.size, lim); if (bad) return toast(bad);
    const isVideo = f.type.startsWith('video/');
    try {
      let duration: number | undefined;
      if (isVideo) {
        setBusy('Checking the video…');
        duration = (await videoDuration(f)) ?? undefined;
        if (duration && duration > limits.videoSeconds + 1) return toast(`Videos can be up to ${Math.round(limits.videoSeconds / 60)} minutes during the beta. Trim it and upload again.`);
      }
      setBusy(`Uploading ${isVideo ? 'video' : 'image'}…`);
      await put('media', f, f.type, { durationSeconds: duration });
      if (isVideo) {
        setBusy('Taking frames for the review…');
        const s = await sampleFrames(f, limits.frames);
        if (s) { for (const fr of s.frames) await put('frame', fr.blob, 'image/jpeg', { frameAt: fr.at }); }
        else toast('Uploaded. Your browser couldn’t read frames from this file, so reviews will use your caption and transcript. Exporting as MP4 (H.264) fixes this.');
      }
      toast(isVideo ? 'Video uploaded' : 'Image uploaded');
    } catch (e: any) { toast(e.message || 'Upload failed'); }
    finally { setBusy(''); router.refresh(); }
  }

  async function uploadShot(f: File | undefined) {
    if (!f || readOnly) return;
    const bad = checkUpload('insight', f.type, f.size, lim); if (bad) return toast(bad);
    try { setBusy('Uploading screenshot…'); await put('insight', f, f.type); toast('Screenshot added'); }
    catch (e: any) { toast(e.message || 'Upload failed'); }
    finally { setBusy(''); router.refresh(); }
  }

  const remove = async (id: string, what: string) => { setBusy(`Deleting ${what}…`); const r = await deleteAsset(id); setBusy(''); toast(r.ok ? r.message ?? 'Deleted' : r.error); router.refresh(); };
  const shown = METRICS.filter(([k]) => snapshots.some(s => (s as any)[k] != null));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>{PLATFORM_LABEL[item.platform]} · {FORMAT_LABEL[item.format]}{item.publishedOn ? ` · ${shortDate(item.publishedOn)}` : ''}</Eyebrow>
          <h1 className="mt-1 font-head text-[clamp(28px,4vw,40px)] leading-tight">{item.title}</h1>
          {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[13px] font-semibold text-sub underline underline-offset-2">Open on {PLATFORM_LABEL[item.platform] === 'Other' ? 'the web' : PLATFORM_LABEL[item.platform]} ↗</a>}
        </div>
        {!readOnly && <Btn onClick={() => setEditing(true)}>Edit details</Btn>}
      </div>
      {busy && <div role="status" className="flex items-center gap-2 rounded-[12px] bg-lavender px-4 py-2.5 text-[14px] font-semibold"><span className="h-4 w-4 animate-spin rounded-full border-2 border-plum border-t-transparent" aria-hidden />{busy}</div>}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card className="flex min-w-0 flex-col gap-3 p-4">
          <Eyebrow>The content</Eyebrow>
          {media?.url ? (media.mime.startsWith('video/')
            ? <video src={media.url} controls playsInline preload="metadata" className="max-h-[520px] w-full rounded-[12px] bg-black" aria-label="Uploaded video" />
            : <img src={media.url} alt="Uploaded content" className="max-h-[520px] w-full rounded-[12px] object-contain bg-soft2" />)
            : <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-line2 px-5 py-8 text-center">
                <span className="text-[15px] font-semibold">Upload the original for a creative review</span>
                <span className="max-w-[340px] text-[13px] text-sub">MP4 or MOV up to {limits.videoMb} MB and {Math.round(limits.videoSeconds / 60)} minutes, or a JPEG, PNG or WEBP image. Only upload content you own or have permission to use.</span>
              </div>}
          {!readOnly && <div className="flex flex-wrap items-center gap-2">
            <Btn variant={media ? 'ghost' : 'primary'} disabled={!!busy} onClick={() => mediaInput.current?.click()}>{media ? 'Replace file' : 'Upload video or image'}</Btn>
            {media && <button className="text-[13px] font-semibold text-sub underline underline-offset-2" disabled={!!busy} onClick={() => remove(media.id, 'file')}>Delete file</button>}
            <input ref={mediaInput} type="file" className="sr-only" aria-label="Video or image file" accept="video/mp4,video/quicktime,image/jpeg,image/png,image/webp" onChange={e => { uploadMedia(e.target.files?.[0]); e.target.value = ''; }} />
          </div>}
          {frames.length > 0 && <div className="min-w-0">
            <div className="mb-1.5 text-[12px] font-semibold text-muted">Frames the review looks at</div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">{frames.map(f => <figure key={f.id} className="flex-none"><img src={f.url} alt={`Frame at ${f.frameAt}s`} className="h-24 rounded-[8px] object-cover" /><figcaption className="text-center font-mono text-[10px] text-muted">{f.frameAt}s</figcaption></figure>)}</div>
          </div>}
        </Card>

        <Card className="flex min-w-0 flex-col gap-3 p-5">
          <Eyebrow>Details</Eyebrow>
          <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[14px]">
            {([['Goal', item.goal], ['Category', item.category], ['Length', item.durationSeconds ? `${item.durationSeconds}s` : ''], ['Caption', item.caption], ['What happens', item.description], ['Voiceover / text', item.transcript]] as [string, string][])
              .map(([k, v]) => <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className={`min-w-0 whitespace-pre-line break-words ${v ? '' : 'text-faint'}`}>{v ? (v.length > 400 ? v.slice(0, 400) + '…' : v) : 'Not added'}</dd></div>)}
          </dl>
          {!item.caption && !item.description && !item.transcript && !readOnly && <p className="text-[13px] text-sub">Add the caption and what happens in the video. Reviews can only comment on what they’re given.</p>}
        </Card>
      </div>

      <Card className="flex min-w-0 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Eyebrow>Performance</Eyebrow>
          {!readOnly && <div className="flex flex-wrap gap-2">
            <Btn disabled={!!busy || shots.length >= limits.insights} onClick={() => shotInput.current?.click()}>Upload insights screenshot</Btn>
            <Btn variant="primary" onClick={() => setAdding(true)}>Add metrics</Btn>
            <input ref={shotInput} type="file" className="sr-only" aria-label="Insights screenshot" accept="image/png,image/jpeg,image/webp" onChange={e => { uploadShot(e.target.files?.[0]); e.target.value = ''; }} />
          </div>}
        </div>
        {shots.length > 0 && <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">{shots.map(s => (
          <figure key={s.id} className="flex flex-none flex-col items-center gap-1">
            <a href={s.url} target="_blank" rel="noopener noreferrer"><img src={s.url} alt="Insights screenshot" className="h-36 rounded-[10px] border border-line object-cover" /></a>
            {!readOnly && <button className="text-[12px] text-sub underline" onClick={() => remove(s.id, 'screenshot')}>Delete</button>}
          </figure>))}</div>}
        {!snapshots.length ? <p className="text-[14px] text-sub">No numbers yet. Add them from your app’s insights (24 hours, 7 days, lifetime…). Every field is optional, and blanks stay blank rather than counting as zero.</p> : (
          <div className="relative overflow-x-auto rounded-[12px] border border-line">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead className="bg-soft2 font-mono text-[10px] uppercase tracking-[.08em] text-muted"><tr><th className="px-3 py-2">Period</th><th className="px-3 py-2">Checked</th>{shown.map(([k, l]) => <th key={k} className="px-3 py-2">{l}</th>)}<th className="px-3 py-2">Source</th>{!readOnly && <th className="px-3 py-2"><span className="sr-only">Actions</span></th>}</tr></thead>
              <tbody>{snapshots.map(s => (
                <tr key={s.id} className="border-t border-line">
                  <td className="px-3 py-2 font-semibold">{PERIOD_LABEL[s.period]}{s.periodNote ? <span className="block text-[11px] font-normal text-muted">{s.periodNote}</span> : null}</td>
                  <td className="px-3 py-2">{shortDate(s.measuredOn)}</td>
                  {shown.map(([k]) => <td key={k} className="px-3 py-2 tnum">{fmtMetric(k, (s as any)[k])}</td>)}
                  <td className="px-3 py-2"><Pill tone="neutral">{s.source === 'screenshot' ? 'From your screenshot' : 'Entered by you'}</Pill></td>
                  {!readOnly && <td className="px-3 py-2"><button className="text-[12px] text-sub underline" aria-label={`Remove ${PERIOD_LABEL[s.period]} metrics from ${s.measuredOn}`} onClick={async () => { const r = await deleteSnapshot(s.id); toast(r.ok ? r.message ?? 'Removed' : r.error); router.refresh(); }}>Remove</button></td>}
                </tr>))}</tbody>
            </table>
          </div>)}
      </Card>

      <FormModal open={editing} onClose={() => setEditing(false)} title="Edit details" submitLabel="Save" fields={contentFields} derive={deriveFromLink}
        initial={{ url: item.url, title: item.title, platform: item.platform, format: item.format, publishedOn: item.publishedOn ?? '', category: item.category, goal: item.goal, caption: item.caption, description: item.description, transcript: item.transcript }}
        action={async v => { const r = await updateContent({ ...v, id: item.id }); if (r.ok) router.refresh(); return r; }}
        deleteLabel="Delete this content" onDelete={async () => { const r = await deleteContent(item.id); if (r.ok) router.push('/content-intelligence'); return r; }} />
      <FormModal open={adding} onClose={() => setAdding(false)} title="Add metrics" submitLabel="Save metrics" fields={snapshotFields(today)} initial={emptySnapshot(today)}
        note="Copy the numbers from your app’s insights. Leave anything you don’t have blank. Each check-in is saved separately, so you can see how the post changes over time."
        action={async v => { const r = await addSnapshot({ ...v, contentId: item.id, source: 'creator' }); if (r.ok) router.refresh(); return r; }} />
    </div>
  );
}
