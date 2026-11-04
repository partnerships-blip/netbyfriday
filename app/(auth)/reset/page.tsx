'use client';
import { useFormState } from 'react-dom';
import { requestReset } from '../auth-actions';
import { AuthFrame } from '../AuthFrame';
import { Btn, Field, Input } from '@/components/ui';

export default function ResetPage() {
  const [state, action] = useFormState(requestReset, {});
  return (
    <AuthFrame>
      <h1 className="font-head text-[42px] leading-tight">Reset your password</h1>
      <form action={action} className="flex flex-col gap-4">
        <Field label="Email"><Input name="email" type="email" required /></Field>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.notice && <p className="text-sm">{state.notice}</p>}
        <Btn variant="primary" size="lg">Send reset link</Btn>
      </form>
    </AuthFrame>
  );
}
