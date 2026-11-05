'use client';
export function PrintButton() {
  return <button onClick={() => window.print()} className="inline-flex h-9 items-center rounded-[10px] bg-ink px-4 text-[13px] font-semibold text-white hover:bg-[#4A2A45]">Download PDF</button>;
}
