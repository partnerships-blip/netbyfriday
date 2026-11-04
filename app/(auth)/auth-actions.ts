'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { normalizeSiteUrl } from '@/lib/site';
import { SignInSchema, SignUpSchema } from '@/lib/validation';

export type AuthState = { error?: string; notice?: string };

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = SignUpSchema.safeParse({ email: form.get('email'), password: form.get('password'), inviteCode: form.get('inviteCode') });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password, inviteCode } = parsed.data;
  const origin = process.env.NEXT_PUBLIC_SITE_URL ? normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) : headers().get('origin') || '';
  const sb = createClient();
  // The database trigger validates and consumes the invite code atomically. An invalid code aborts the sign-up.
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { invite_code: inviteCode }, emailRedirectTo: `${origin}/auth/callback?next=/onboarding` } });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes('database error') || m.includes('invite')) return { error: 'That invite code is invalid, expired, or already used.' };
    if (m.includes('already registered')) return { error: 'An account with that email already exists. Sign in instead.' };
    if (m.includes('password')) return { error: error.message };
    console.error('[signup]', error);
    return { error: 'Sign-up failed. Please try again.' };
  }
  if (!data.session) return { notice: 'Check your email to confirm your address, then come back to sign in.' };
  redirect('/onboarding');
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = SignInSchema.safeParse({ email: form.get('email'), password: form.get('password') });
  if (!parsed.success) return { error: 'Enter your email and password.' };
  const sb = createClient();
  const { error } = await sb.auth.signInWithPassword(parsed.data);
  if (error) return { error: 'Email or password is incorrect.' };
  const next = String(form.get('next') || '/overview');
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/overview');
}

export async function requestReset(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get('email') || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Enter a valid email address.' };
  const origin = process.env.NEXT_PUBLIC_SITE_URL ? normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) : headers().get('origin') || '';
  await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset/update` });
  return { notice: 'If that email has an account, a reset link is on its way.' };
}

export async function updatePassword(_: AuthState, form: FormData): Promise<AuthState> {
  const pw = String(form.get('password') || '');
  if (pw.length < 10) return { error: 'Use at least 10 characters.' };
  const { error } = await createClient().auth.updateUser({ password: pw });
  if (error) return { error: 'Could not update the password. Request a new link.' };
  redirect('/overview');
}
