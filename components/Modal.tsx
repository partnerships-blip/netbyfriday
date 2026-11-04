'use client';
import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onClick={e => { if (e.target === ref.current) onClose(); }}
      className={`m-auto max-h-[calc(100%-40px)] w-[calc(100%-24px)] overflow-auto rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-ink/30 ${wide ? 'max-w-[680px]' : 'max-w-[560px]'}`}>
      {open && <div className="p-[22px]">{children}</div>}
    </dialog>
  );
}

export function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); if (open) window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/20" onClick={onClose} />
      <aside role="dialog" aria-modal="true" className="animate-in fixed inset-y-0 right-0 z-50 w-full overflow-auto border-l border-line bg-white shadow-2xl md:w-[580px]">{children}</aside>
    </>
  );
}
