'use client';
import { useFormState } from 'react-dom';
import { updatePassword } from '../../auth-actions';
import { AuthFrame } from '../../AuthFrame';
import { Btn, Field, Input } from '@/components/ui';

export default function UpdatePasswordPage() {
  const [state, action] = useFormState(updatePassword, {});
  return (
    <AuthFrame>
      <h1 className="font-head text-[42px] leading-tight">Choose a new password</h1>
      <form action={action} className="flex flex-col gap-4">
        <Field label="New password"><Input name="password" type="password" minLength={10} autoComplete="new-password" required /></Field>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <Btn variant="primary" size="lg">Save password</Btn>
      </form>
    </AuthFrame>
  );
}
