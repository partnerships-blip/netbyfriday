'use client';
import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { signIn } from '../auth-actions';
import { AuthFrame } from '../AuthFrame';
import { Btn, Field, Input } from '@/components/ui';

function Submit() { const { pending } = useFormStatus(); return <Btn variant="primary" size="lg" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</Btn>; }

export function LoginForm({ next, error }: { next: string; error?: string }) {
  const [state, action] = useFormState(signIn, {});
  return (
    <AuthFrame>
      <div><h1 className="font-head text-[42px] leading-tight">Sign in</h1><p className="mt-2 text-[15px] text-muted">Welcome back.</p></div>
      {error === 'access' && <p className="text-sm text-danger">This account doesn't have beta access.</p>}
      {error === 'link' && <p className="text-sm text-danger">That link has expired. Sign in or request a new one.</p>}
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <Field label="Email"><Input name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Password"><Input name="password" type="password" autoComplete="current-password" required /></Field>
        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        <div className="flex items-center gap-4"><Submit /><Link href="/reset" className="text-sm text-sub underline underline-offset-2">Forgot password</Link></div>
      </form>
      <p className="text-sm text-muted">Have an invite? <Link href="/signup" className="text-ink underline underline-offset-2">Create your account</Link></p>
    </AuthFrame>
  );
}
