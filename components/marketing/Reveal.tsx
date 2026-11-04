'use client';
import { useEffect, useRef, type ReactNode } from 'react';
/** Fades content in when 12% visible. Content below the fold only; skipped entirely with reduced motion (CSS). */
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (el.getBoundingClientRect().top < window.innerHeight || !('IntersectionObserver' in window)) { el.classList.add('nbf-in'); return; }
    const o = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { el.classList.add('nbf-in'); o.disconnect(); } }), { threshold: 0.12 });
    o.observe(el); return () => o.disconnect();
  }, []);
  return <div ref={ref} className={`nbf-reveal ${className}`}>{children}</div>;
}
