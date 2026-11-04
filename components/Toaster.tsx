'use client';
import { useEffect, useState, useTransition, useCallback } from 'react';
import type { ActionResult } from '@/lib/types';

export function toast(message: string, tone: 'ok' | 'error' = 'ok') {
  window.dispatchEvent(new CustomEvent('ci-toast', { detail: { message, tone } }));
}

export function Toaster() {
  const [t, setT] = useState<{ message: string; tone: string } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const on = (e: Event) => { setT((e as CustomEvent).detail); clearTimeout(timer); timer = setTimeout(() => setT(null), 3200); };
    window.addEventListener('ci-toast', on);
    return () => { window.removeEventListener('ci-toast', on); clearTimeout(timer); };
  }, []);
  if (!t) return null;
  return (
    <div role="status" aria-live="polite" className={`animate-in fixed bottom-20 left-1/2 z-[70] max-w-[calc(100%-32px)] -translate-x-1/2 rounded-[10px] px-4 py-3 text-sm shadow-lg md:bottom-6 ${t.tone === 'error' ? 'bg-danger text-white' : 'bg-ink text-bg'}`}>{t.message}</div>
  );
}

/** Runs a server action with pending state and toasts the result. */
export function useAction() {
  const [pending, start] = useTransition();
  const run = useCallback((fn: () => Promise<ActionResult>, onOk?: (r: ActionResult) => void) => {
    start(async () => {
      const r = await fn();
      if (r.ok) { if (r.message) toast(r.message); onOk?.(r); } else toast(r.error, 'error');
    });
  }, []);
  return [pending, run] as const;
}
