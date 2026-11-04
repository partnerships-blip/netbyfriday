'use client';
import { useState } from 'react';
export function RevenueBars({ months }: { months: { label: string; value: string; cents: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...months.map(m => m.cents));
  return (
    <div className="flex h-[200px] items-end gap-1 min-[860px]:gap-2.5" onMouseLeave={() => setHover(null)} role="img" aria-label={`Monthly revenue received: ${months.map(m => `${m.label} ${m.value}`).join(', ')}`}>
      {months.map((m, i) => (
        <div key={m.label} className="relative flex h-full flex-1 flex-col items-center justify-end gap-1.5" onMouseEnter={() => setHover(i)}>
          <span className="absolute -top-1 whitespace-nowrap rounded-md bg-plum px-1.5 py-0.5 text-[11px] font-bold text-white transition-opacity" style={{ opacity: hover === i ? 1 : 0 }}>{m.value}</span>
          <div className="w-full rounded-t-md transition-[height,background] duration-300" style={{ height: Math.max(3, m.cents / max * 85) + '%', background: hover === i ? '#DFFF43' : i === months.length - 1 ? '#C4B0C0' : '#32152F' }} />
          <span className="text-[11px] text-muted"><span className="min-[860px]:hidden">{m.label[0]}</span><span className="hidden min-[860px]:inline">{m.label}</span></span>
        </div>))}
    </div>
  );
}
