import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-card border border-line bg-white', className)}>{children}</div>;
}
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('font-mono text-[11px] uppercase tracking-[.08em] text-muted', className)}>{children}</div>;
}
const V = {
  primary: 'bg-ink text-white hover:bg-[#4A2A45]',
  secondary: 'border border-line2 bg-white text-ink hover:border-faint',
  accent: 'bg-ac text-ac-ink hover:opacity-90',
  ghost: 'text-sub underline underline-offset-[3px] hover:text-ink',
  danger: 'border border-[#E8C9C0] bg-white text-danger hover:border-danger'
};
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof V; size?: 'sm' | 'md' | 'lg' };
export function Btn({ variant = 'secondary', size = 'md', className, ...p }: BtnProps) {
  return <button {...p} className={cx('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
    variant === 'ghost' ? 'h-auto px-0 text-[13px]' : size === 'sm' ? 'h-[30px] px-2.5 text-xs' : size === 'lg' ? 'h-[46px] px-5 text-[15px]' : 'h-9 px-3.5 text-[13px]', V[variant], className)} />;
}
export const TONE = {
  ok: 'bg-[#E3EEE5] text-ok', warn: 'bg-[#F5ECD8] text-[#7A4E0E]', danger: 'bg-[#F3DDD6] text-danger',
  neutral: 'bg-[#F0EBF2] text-sub', accent: 'bg-ac-soft text-ac-text', ink: 'bg-ink text-white'
};
export function Pill({ tone = 'neutral', children, className }: { tone?: keyof typeof TONE; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium', TONE[tone], className)}>{children}</span>;
}
export const EVIDENCE: Record<string, { label: string; tone: keyof typeof TONE }> = {
  verified: { label: 'Verified from your records', tone: 'ok' }, estimate: { label: 'Estimate', tone: 'warn' },
  suggested: { label: 'Suggested opportunity', tone: 'accent' }, insufficient: { label: 'Insufficient data', tone: 'neutral' }
};
export const inputCls = 'h-10 w-full rounded-[10px] border border-line2 bg-white px-3 text-sm font-normal text-ink outline-none focus:border-ink';
export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <label className={cx('flex flex-col gap-1.5 text-[13px] font-medium', className)}>{label}{children}</label>;
}
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputCls, p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(inputCls, 'px-2', p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cx(inputCls, 'h-auto min-h-[84px] py-2.5 leading-relaxed', p.className)} />;

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h1 className="font-head text-[36px] leading-[1.05] md:text-5xl">{title}</h1>
        {sub && <p className="max-w-[640px] text-[15px] leading-relaxed text-muted text-pretty">{sub}</p>}
      </div>
      {children}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-card border border-dashed border-line2 bg-white p-7 text-sm leading-relaxed text-sub">{children}</div>;
}
export function Bar({ pct, color = 'var(--ac)', h = 6 }: { pct: number; color?: string; h?: number }) {
  return <div className="rounded-full bg-soft2" style={{ height: h }}><div className="h-full rounded-full transition-[width] duration-500" style={{ width: Math.max(0, Math.min(100, pct)) + '%', background: color }} /></div>;
}
export function ReadOnlyNote({ show }: { show: boolean }) {
  if (!show) return null;
  return <div className="rounded-[10px] border border-dashed border-faint px-3 py-2 text-[13px] text-sub">You are viewing fictional demo data. Changes are disabled. Switch to your workspace in Settings or the sidebar.</div>;
}
