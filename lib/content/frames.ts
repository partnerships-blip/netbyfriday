'use client';
// Samples still frames from a video in the browser (no server video processing). Returns null when the browser
// can't decode the file (some MOV/HEVC exports), in which case the review relies on the caption and transcript.
export async function sampleFrames(file: File, count: number, maxSide = 720): Promise<{ duration: number; frames: { blob: Blob; at: number }[] } | null> {
  const url = URL.createObjectURL(file);
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
  const once = (ev: string, ms = 8000) => new Promise<boolean>(res => { const t = setTimeout(() => res(false), ms); v.addEventListener(ev, () => { clearTimeout(t); res(true); }, { once: true }); v.addEventListener('error', () => { clearTimeout(t); res(false); }, { once: true }); });
  try {
    if (!(await once('loadeddata'))) return null;
    const duration = v.duration; if (!Number.isFinite(duration) || duration <= 0 || !v.videoWidth) return null;
    const scale = Math.min(1, maxSide / Math.max(v.videoWidth, v.videoHeight));
    const cv = document.createElement('canvas'); cv.width = Math.round(v.videoWidth * scale); cv.height = Math.round(v.videoHeight * scale);
    const ctx = cv.getContext('2d'); if (!ctx) return null;
    // The opening matters most for hooks: 0.5s, 1.5s, 3s, then evenly spaced to near the end.
    const early = [0.5, 1.5, 3].filter(t => t < duration);
    const rest = Math.max(0, count - early.length);
    const times = [...early, ...Array.from({ length: rest }, (_, i) => 3 + (duration - 3.5) * (i + 1) / (rest + 1))].filter(t => t > 0 && t < duration).slice(0, count);
    const frames: { blob: Blob; at: number }[] = [];
    for (const at of times) {
      v.currentTime = at; if (!(await once('seeked'))) continue;
      ctx.drawImage(v, 0, 0, cv.width, cv.height);
      let q = 0.72, blob: Blob | null = null;
      do { blob = await new Promise<Blob | null>(r => cv.toBlob(r, 'image/jpeg', q)); q -= 0.15; } while (blob && blob.size > 550_000 && q > 0.3);
      if (blob) frames.push({ blob, at: Math.round(at * 100) / 100 });
    }
    return frames.length ? { duration, frames } : null;
  } finally { URL.revokeObjectURL(url); v.removeAttribute('src'); v.load(); }
}

/** Reads a video's duration without decoding frames (used to check the beta length limit before uploading). */
export async function videoDuration(file: File): Promise<number | null> {
  const url = URL.createObjectURL(file); const v = document.createElement('video'); v.preload = 'metadata'; v.src = url;
  try { return await new Promise<number | null>(res => { const t = setTimeout(() => res(null), 6000); v.onloadedmetadata = () => { clearTimeout(t); res(Number.isFinite(v.duration) ? v.duration : null); }; v.onerror = () => { clearTimeout(t); res(null); }; }); }
  finally { URL.revokeObjectURL(url); }
}
