'use client';
import { useState, type InputHTMLAttributes } from 'react';
import { Input } from '@/components/ui';

/** A password field with a Show / Hide toggle. Use inside <Field>, like Input. */
export function PasswordInput(p: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [shown, setShown] = useState(false);
  return (
    <span className="relative flex">
      <Input {...p} type={shown ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} className={`w-full pr-16 ${p.className ?? ''}`} />
      <button type="button" aria-pressed={shown} onClick={() => setShown(s => !s)}
        className="absolute inset-y-0 right-1.5 my-auto h-7 rounded-md px-2 text-[12px] font-semibold text-sub hover:bg-bg hover:text-ink">
        {shown ? 'Hide' : 'Show'}
      </button>
    </span>
  );
}
