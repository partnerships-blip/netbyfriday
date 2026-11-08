import type { ReactNode } from 'react';
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-[760px] px-6 py-[clamp(56px,8vw,112px)]">
      <div className="mb-6 rounded-xl border border-dashed border-faint bg-white px-4 py-3 text-sm text-sub">Draft for review. This page describes how the private beta works today and will be reviewed by a lawyer before public launch.</div>
      <h1 className="text-[clamp(38px,5vw,60px)] font-extrabold leading-none tracking-[-.045em]">{title}</h1>
      <p className="mt-3 text-sm text-muted">Last updated {updated}</p>
      <div className="mt-8 flex flex-col gap-4 text-[16px] leading-relaxed text-[#4A2A45] [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_a]:underline">{children}</div>
    </article>
  );
}
