'use client';
import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { signUp } from '../auth-actions';
import { AuthFrame } from '../AuthFrame';
import { Btn, Eyebrow, Field, Input } from '@/components/ui';

function Submit() { const { pending } = useFormStatus(); return <Btn variant="primary" size="lg" disabled={pending}>{pending ? 'Creating…' : 'Create account'}</Btn>; }

export default function SignUpPage() {
  const [state, action] = useFormState(signUp, {});
  return (
    <AuthFrame>
      <div className="flex flex-col gap-2.5"><Eyebrow>Step 1 of 4</Eyebrow><div className="h-[3px] rounded bg-line"><div className="h-full w-1/4 rounded bg-ink" /></div></div>
      <div><h1 className="font-head text-[42px] leading-tight">Create your account</h1><p className="mt-2 text-[15px] leading-relaxed text-muted">One place for your partnerships, invoices, revenue and next moves.</p></div>
      {state.notice ? <p className="rounded-xl border border-line bg-white p-4 text-[15px]">{state.notice}</p> : (
        <form action={action} className="flex flex-col gap-4">
          <Field label="Invite code"><Input name="inviteCode" autoComplete="off" placeholder="From your invitation" className="font-mono uppercase" required /></Field>
          <Field label="Email"><Input name="email" type="email" autoComplete="email" required /></Field>
          <Field label="Password"><Input name="password" type="password" autoComplete="new-password" minLength={10} placeholder="At least 10 characters" required /></Field>
          {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
          <Submit />
        </form>
      )}
      <p className="text-sm text-muted">Already have an account? <Link href="/login" className="text-ink underline underline-offset-2">Sign in</Link></p>
    </AuthFrame>
  );
}
