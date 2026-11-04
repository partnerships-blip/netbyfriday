import type { ReactNode } from 'react';

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-bg">
      <div className="sticky top-0 hidden h-dvh w-[42%] max-w-[560px] flex-col justify-between bg-ink px-12 py-11 text-bg md:flex">
        <div className="flex items-center gap-2.5">
          <div className="h-[22px] w-[22px] rounded-md bg-ac" />
          <div className="text-[15px] font-semibold">netbyfriday</div>
          <div className="rounded-full border border-[#4A2A45] px-2 py-0.5 font-mono text-[10px] tracking-wider text-[#CDB9C9]">PRIVATE BETA</div>
        </div>
        <div className="flex flex-col gap-5">
          <div className="font-head text-[60px] leading-none text-balance">The intelligence behind your influence.</div>
          <p className="max-w-[400px] text-base leading-relaxed text-[#CDB9C9]">Turn creator activity into business intelligence: what you earn, who owes you, which partners to call back, and what to do next.</p>
        </div>
        <p className="text-xs text-[#CDB9C9]">Invite only. Your records are private to your account.</p>
      </div>
      <div className="flex flex-1 justify-center px-5 py-10 md:px-12 md:py-16">
        <div className="animate-in flex w-full max-w-[460px] flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}
