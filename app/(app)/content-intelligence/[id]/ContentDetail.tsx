'use client';
// One content item: preview and original upload, details, performance history (each measurement kept with its date and
// period), and insight screenshots. Analyses and business links build on this page in later milestones.
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Btn, Card, Eyebrow, Pill, cx } from '@/components/ui';
import { FormModal } from '@/components/FormModal';
import { toast } from '@/components/Toaster';
import { createClient } from '@/lib/supabase/client';
import { shortDate } from '@/lib/finance/core.js';
import { PLATFORM_LABEL, FORMAT_LABEL, PERIOD_LABEL, METRICS, checkUpload, LIMITS } from '@/lib/content/model';
import { contentFields, deriveFromLink, snapshotFields, emptySnapshot } from '@/lib/content/fields';
import { sampleFrames, videoDuration } from '@/lib/content/frames';
import type { Asset, ContentItem, Snapshot } from '@/lib/content/server';
import { updateContent, deleteContent, addSnapshot, deleteSnapshot, prepareUpload, confirmUpload, deleteAsset, extractInsights, analyzeContent, setIdeaDone, linkContent, unlinkContent } from '../actions';
import Link from 'next/link';
import { InsightReview } from './InsightReview';
import type { Extraction } from '@/lib/content/extract';
import type { Impact } from '@/lib/content/business';
import { formatCents } from '@/lib/finance/core.js';

type Lim = { videoMb: number; imageMb: number; videoSeconds: number; frames: number; insights: number };
const fmtMetric = (k: string, v: number | null) => v == null ? '—' : k === 'skipRate' || k === 'retentionPct' ? `${v}%` : k === 'avgWatchSeconds' ? `${v}s` : v.toLocaleString('en-US');

type ReportLite = { id: string; mode: string; title: string; savedAt: string | null; createdAt: string };
type Opt = { id: string; label: string };
export function ContentDetail({ item, assets, snapshots, reports, ideas, impact, dealOptions, incomeOptions, today, readOnly, limits }: { item: ContentItem; assets: Asset[]; snapshots: Snapshot[]; reports: ReportLite[]; ideas: { id: string; text: string; done: boolean }[]; impact: Impact; dealOptions: Opt[]; incomeOptions: Opt[]; today: string; readOnly: boolean; limits: Lim }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState('');
  const [review, setReview] = useState<{ assetId: string; extraction: Extraction } | null>(null);
  const [snapPick, setSnapPick] = useState('');
  const [linkPick, setLinkPick] = useState('');
  async function analyze(mode: 'creative' | 'performance' | 'business') {
    setBusy(mode === 'creative' ? 'Reviewing your content… this takes about 20 seconds' : mode === 'business' ? 'Looking at what this post is linked to… this takes about 20 seconds' : 'Comparing and analyzing your numbers… this takes about 20 seconds');
    const r = await analyzeContent({ contentId: item.id, mode, snapshotId: mode === 'performance' && snapPick ? snapPick : undefined });
    setBusy('');
    if (!r.ok) return toast(r.error);
    if (r.cached && r.message) toast(r.message);
    router.push(`/content-intelligence/${item.id}/analysis/${r.reportId}`);
  }
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
    return c.id!;
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
    let id = '';
    try { setBusy('Uploading screenshot…'); id = await put('insight', f, f.type); toast('Screenshot added'); }
    catch (e: any) { toast(e.message || 'Upload failed'); setBusy(''); return; }
    router.refresh();
    await read(id);
  }

  /** Reads the screenshot (or reuses the saved reading) and opens the review. */
  async function read(assetId: string, again = false) {
    setBusy('Reading the numbers…');
    const r = await extractInsights(assetId, again);
    setBusy('');
    if (!r.ok) return toast(r.error);
    setReview({ assetId, extraction: r.extraction! });
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
            {!readOnly && <span className="flex gap-2">
              <button className="text-[12px] font-semibold text-ink underline" disabled={!!busy} onClick={() => read(s.id)}>Check the numbers</button>
              <button className="text-[12px] text-sub underline" onClick={() => remove(s.id, 'screenshot')}>Delete</button></span>}
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
      <Card className="flex min-w-0 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><Eyebrow>Business impact</Eyebrow><span className="text-[12px] text-muted">Linked by you. A link isn’t proof the post caused it.</span></div>
        {impact.deals.length + impact.income.length > 0 ? <>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="rounded-[14px] bg-soft2 p-3.5"><div className="text-[12px] font-semibold text-muted">Linked partnerships</div><div className="font-head text-[26px] leading-none">{impact.deals.length}</div></div>
            <div className="rounded-[14px] bg-soft2 p-3.5"><div className="text-[12px] font-semibold text-muted">Agreed fees (contracted)</div><div className="font-head text-[26px] leading-none tnum">{formatCents(impact.contractedCents)}</div>{impact.estimatedCents > 0 && <div className="mt-1 text-[11px] text-muted">+ {formatCents(impact.estimatedCents)} in estimates, not counted</div>}</div>
            <div className="rounded-[14px] bg-[#EEF5EF] p-3.5"><div className="text-[12px] font-semibold text-muted">Received so far</div><div className="font-head text-[26px] leading-none tnum">{formatCents(impact.receivedCents)}</div><div className="mt-1 text-[11px] text-muted">Payments and income you recorded</div></div>
          </div>
          <ul className="flex flex-col">{[...impact.deals.map(d => ({ id: d.linkId, href: `/partnerships?deal=${d.dealId}`, label: d.label, sub: `${d.feeIsEstimate ? 'Estimate' : 'Agreed'} ${formatCents(d.feeCents)} · received ${formatCents(d.receivedCents)}` })),
              ...impact.income.map(e => ({ id: e.linkId, href: '/money', label: e.label, sub: `${formatCents(e.amountCents)} received ${shortDate(e.receivedOn)}` }))].map(l => (
            <li key={l.id} className="flex items-center justify-between gap-3 border-t border-line py-2.5 text-[14px]">
              <span className="min-w-0"><Link href={l.href} className="font-semibold underline-offset-2 hover:underline">{l.label}</Link><span className="block text-[12px] text-muted">{l.sub}</span></span>
              {!readOnly && <button className="flex-none text-[12px] text-sub underline" aria-label={`Unlink ${l.label}`} onClick={async () => { const r = await unlinkContent(l.id); toast(r.ok ? r.message ?? '' : r.error); router.refresh(); }}>Unlink</button>}
            </li>))}</ul>
        </> : <p className="text-[14px] text-sub">Did this post bring in a brand inquiry, a deal, or affiliate sales? Link it to the partnership or income you’ve recorded, and see what your content is associated with over time.</p>}
        {!readOnly && (dealOptions.length > 0 || incomeOptions.length > 0) && <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Link to a partnership or income" value={linkPick} onChange={e => setLinkPick(e.target.value)} className="h-9 min-w-0 max-w-full flex-1 rounded-[10px] border border-line2 bg-white px-2 text-[13px] sm:max-w-[420px]">
            <option value="">Choose a partnership or income…</option>
            {dealOptions.length > 0 && <optgroup label="Partnerships">{dealOptions.map(o => <option key={o.id} value={'d:' + o.id}>{o.label}</option>)}</optgroup>}
            {incomeOptions.length > 0 && <optgroup label="Income">{incomeOptions.map(o => <option key={o.id} value={'i:' + o.id}>{o.label}</option>)}</optgroup>}
          </select>
          <Btn disabled={!linkPick || !!busy} onClick={async () => { const [k, id] = linkPick.split(':'); const r = await linkContent({ contentId: item.id, ...(k === 'd' ? { dealId: id } : { incomeId: id }) }); toast(r.ok ? r.message ?? '' : r.error); if (r.ok) { setLinkPick(''); router.refresh(); } }}>Link</Btn>
        </div>}
        {!readOnly && !dealOptions.length && !incomeOptions.length && impact.deals.length + impact.income.length === 0 && <p className="text-[13px] text-muted">Add a partnership or income first, then link it here.</p>}
      </Card>

      <Card className="flex min-w-0 flex-col gap-4 p-5">
        <Eyebrow>Analyze</Eyebrow>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-[14px] border border-line p-4">
            <span className="text-[16px] font-bold">Creative review</span>
            <span className="text-[13px] leading-snug text-sub">Hook, opening, pacing, storytelling, on-screen text, call to action. Based on the frames, image and text you added. No performance claims.</span>
            {!readOnly && <Btn variant="primary" className="mt-auto w-fit" disabled={!!busy || (!frames.length && !media && !item.caption && !item.description && !item.transcript)} onClick={() => analyze('creative')}>Run creative review</Btn>}
          </div>
          <div className="flex flex-col gap-2 rounded-[14px] border border-line p-4">
            <span className="text-[16px] font-bold">Performance check-in</span>
            <span className="text-[13px] leading-snug text-sub">What your numbers show, compared with your other {FORMAT_LABEL[item.format]}s on {PLATFORM_LABEL[item.platform]} over the same period, when you have enough of them.</span>
            {snapshots.length > 1 && <select aria-label="Numbers to analyze" className="h-9 rounded-[10px] border border-line2 bg-white px-2 text-[13px]" value={snapPick} onChange={e => setSnapPick(e.target.value)}>
              <option value="">Latest: {PERIOD_LABEL[snapshots[0].period]} · {shortDate(snapshots[0].measuredOn)}</option>
              {snapshots.slice(1).map(s => <option key={s.id} value={s.id}>{PERIOD_LABEL[s.period]} · {shortDate(s.measuredOn)}</option>)}</select>}
            {!readOnly && <Btn variant="primary" className="mt-auto w-fit" disabled={!!busy || !snapshots.length} onClick={() => analyze('performance')}>{snapshots.length ? 'Run check-in' : 'Add numbers first'}</Btn>}
          </div>
          <div className="flex flex-col gap-2 rounded-[14px] border border-line p-4">
            <span className="text-[16px] font-bold">Business impact</span>
            <span className="text-[13px] leading-snug text-sub">What this post is linked to in your records, how to use it in pitches, and what to make more of. Agreed fees and money received are kept apart.</span>
            {!readOnly && <Btn variant="primary" className="mt-auto w-fit" disabled={!!busy || impact.deals.length + impact.income.length === 0} onClick={() => analyze('business')}>{impact.deals.length + impact.income.length ? 'Run business impact' : 'Link a deal first'}</Btn>}
          </div>
        </div>
        {reports.length > 0 && <div className="flex flex-col">
          <div className="mb-1 text-[12px] font-semibold text-muted">Past analyses</div>
          {reports.map(r => <Link key={r.id} href={`/content-intelligence/${item.id}/analysis/${r.id}`} className="flex items-center justify-between gap-3 border-t border-line py-2.5 text-[14px] hover:bg-soft2/50">
            <span className="font-semibold">{r.title}</span>
            <span className="flex flex-none items-center gap-2 text-[12px] text-muted">{r.savedAt && <Pill tone="ok">Saved</Pill>}{new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ›</span></Link>)}
        </div>}
      </Card>

      {ideas.length > 0 && <Card className="flex min-w-0 flex-col gap-2 p-5">
        <Eyebrow>Saved ideas</Eyebrow>
        <ul className="flex flex-col">{ideas.map(i => (
          <li key={i.id} className="flex items-start gap-3 border-t border-line py-2.5 first:border-0">
            <input type="checkbox" className="mt-1" aria-label={`Done: ${i.text}`} checked={i.done} disabled={readOnly} onChange={async e => { const r = await setIdeaDone(i.id, e.target.checked); if (!r.ok) toast(r.error); router.refresh(); }} />
            <span className={cx('text-[15px] leading-relaxed', i.done && 'text-faint line-through')}>{i.text}</span>
          </li>))}</ul>
      </Card>}

      <InsightReview open={!!review} onClose={() => setReview(null)} extraction={review?.extraction ?? null} contentId={item.id} assetId={review?.assetId ?? ''} today={today}
        imageUrl={shots.find(x => x.id === review?.assetId)?.url} onSaved={() => router.refresh()} onManual={() => setAdding(true)} />
      <FormModal open={adding} onClose={() => setAdding(false)} title="Add metrics" submitLabel="Save metrics" fields={snapshotFields(today)} initial={emptySnapshot(today)}
        note="Copy the numbers from your app’s insights. Leave anything you don’t have blank. Each check-in is saved separately, so you can see how the post changes over time."
        action={async v => { const r = await addSnapshot({ ...v, contentId: item.id, source: 'creator' }); if (r.ok) router.refresh(); return r; }} />
    </div>
  );
}
